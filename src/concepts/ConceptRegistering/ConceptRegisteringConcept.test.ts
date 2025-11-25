import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ConceptRegisteringConcept, {
  Author,
  Concept,
  Version,
} from "./ConceptRegisteringConcept.ts";

const authorA = "author:Alice" as Author;
const authorB = "author:Bob" as Author;

// Disable sanitizers due to MongoDB connection cleanup timing
const testOpts = { sanitizeResources: false, sanitizeOps: false };

Deno.test({ name: "Principle: reserve name, publish versions, deprecate and yank", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    // Reserve a unique name
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "my-concept",
      owner: authorA,
    });
    assertEquals("concept" in reserveRes, true, "Reserve should succeed");
    if (!("concept" in reserveRes)) return;
    const conceptId = reserveRes.concept;

    // Publish version 1.0.0
    const v1Res = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "1.0.0",
      artifactUrl: "https://artifacts.example.com/my-concept-1.0.0.tar.gz",
    });
    assertEquals("version" in v1Res, true, "Publish v1.0.0 should succeed");
    if (!("version" in v1Res)) return;
    const v1Id = v1Res.version;

    // Publish version 2.0.0
    const v2Res = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "2.0.0",
      artifactUrl: "https://artifacts.example.com/my-concept-2.0.0.tar.gz",
    });
    assertEquals("version" in v2Res, true, "Publish v2.0.0 should succeed");
    if (!("version" in v2Res)) return;
    const v2Id = v2Res.version;

    // Latest published should be v2.0.0 (most recent)
    const latestArr = await conceptReg._latestPublished({ concept: conceptId });
    assertEquals(latestArr.length, 1);
    assertEquals(latestArr[0].version, v2Id);

    // Deprecate v1.0.0
    const deprecateRes = await conceptReg.deprecate({ version: v1Id });
    assertEquals("ok" in deprecateRes, true, "Deprecate should succeed");

    // Yank v1.0.0 (from DEPRECATED)
    const yankRes = await conceptReg.yank({ version: v1Id });
    assertEquals("ok" in yankRes, true, "Yank should succeed");

    // Yank v2.0.0 directly (from PUBLISHED)
    const yankV2Res = await conceptReg.yank({ version: v2Id });
    assertEquals("ok" in yankV2Res, true, "Yank from PUBLISHED should succeed");

    // Now latest published should be empty
    const latestAfterYank = await conceptReg._latestPublished({ concept: conceptId });
    assertEquals(latestAfterYank.length, 0, "No published versions after yanking all");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: reserveName enforces uniqueName uniqueness", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const first = await conceptReg.reserveName({
      uniqueName: "unique-concept",
      owner: authorA,
    });
    assertEquals("concept" in first, true, "First reserve should succeed");

    const second = await conceptReg.reserveName({
      uniqueName: "unique-concept",
      owner: authorB,
    });
    assertEquals("error" in second, true, "Duplicate uniqueName should fail");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: reserveName requires uniqueName and owner", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    // Missing uniqueName
    const res1 = await conceptReg.reserveName({
      uniqueName: "",
      owner: authorA,
    });
    assertEquals("error" in res1, true, "Empty uniqueName should fail");

    // Missing owner
    // @ts-ignore intentional missing owner
    const res2 = await conceptReg.reserveName({
      uniqueName: "test-concept",
    });
    assertEquals("error" in res2, true, "Missing owner should fail");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: publishVersion requires existing concept", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistentConcept = "concept:nonexistent" as Concept;
    const res = await conceptReg.publishVersion({
      concept: nonExistentConcept,
      semver: "1.0.0",
      artifactUrl: "https://example.com/artifact.tar.gz",
    });
    assertEquals("error" in res, true, "Publishing to non-existent concept should fail");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: publishVersion enforces unique semver unless YANKED", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    // Reserve concept
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "versioned-concept",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;
    const conceptId = reserveRes.concept;

    // Publish 1.0.0
    const v1 = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1.tar.gz",
    });
    assertEquals("version" in v1, true);

    // Try publishing 1.0.0 again (should fail)
    const v1Dup = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1-dup.tar.gz",
    });
    assertEquals("error" in v1Dup, true, "Duplicate semver should fail");

    // Yank v1.0.0
    if ("version" in v1) {
      await conceptReg.yank({ version: v1.version });
    }

    // Now publishing 1.0.0 again should succeed (since previous was yanked)
    const v1After = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1-new.tar.gz",
    });
    assertEquals("version" in v1After, true, "Re-publishing yanked semver should succeed");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: deprecate requires version to be PUBLISHED", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    // Reserve and publish
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "deprecate-test",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;

    const v1 = await conceptReg.publishVersion({
      concept: reserveRes.concept,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1.tar.gz",
    });
    if (!("version" in v1)) return;

    // Deprecate first time (should succeed)
    const dep1 = await conceptReg.deprecate({ version: v1.version });
    assertEquals("ok" in dep1, true);

    // Deprecate again (should fail - already deprecated)
    const dep2 = await conceptReg.deprecate({ version: v1.version });
    assertEquals("error" in dep2, true, "Cannot deprecate already deprecated version");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: deprecate requires version to exist", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistentVersion = "version:nonexistent" as Version;
    const res = await conceptReg.deprecate({ version: nonExistentVersion });
    assertEquals("error" in res, true, "Deprecating non-existent version should fail");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: yank requires PUBLISHED or DEPRECATED status", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    // Reserve and publish
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "yank-test",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;

    const v1 = await conceptReg.publishVersion({
      concept: reserveRes.concept,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1.tar.gz",
    });
    if (!("version" in v1)) return;

    // Yank from PUBLISHED (should succeed)
    const yank1 = await conceptReg.yank({ version: v1.version });
    assertEquals("ok" in yank1, true);

    // Yank again (should fail - already yanked)
    const yank2 = await conceptReg.yank({ version: v1.version });
    assertEquals("error" in yank2, true, "Cannot yank already yanked version");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Action: yank requires version to exist", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistentVersion = "version:nonexistent" as Version;
    const res = await conceptReg.yank({ version: nonExistentVersion });
    assertEquals("error" in res, true, "Yanking non-existent version should fail");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _findByName returns matching concepts", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    await conceptReg.reserveName({ uniqueName: "alpha-lib", owner: authorA });
    await conceptReg.reserveName({ uniqueName: "beta-lib", owner: authorA });
    await conceptReg.reserveName({ uniqueName: "gamma-service", owner: authorB });

    // Search for "lib"
    const libResults = await conceptReg._findByName({ substring: "lib" });
    assertEquals(libResults.length, 2);

    // Search for "alpha"
    const alphaResults = await conceptReg._findByName({ substring: "alpha" });
    assertEquals(alphaResults.length, 1);

    // Search for "xyz" (no matches)
    const noResults = await conceptReg._findByName({ substring: "xyz" });
    assertEquals(noResults.length, 0);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _getOwner returns correct owner", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "owner-test",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;

    const ownerArr = await conceptReg._getOwner({ concept: reserveRes.concept });
    assertEquals(ownerArr.length, 1);
    assertEquals(ownerArr[0].owner, authorA);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _getOwner returns empty for non-existent concept", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistent = "concept:nonexistent" as Concept;
    const ownerArr = await conceptReg._getOwner({ concept: nonExistent });
    assertEquals(ownerArr.length, 0);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _getOwnerOfVersion returns correct owner", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "version-owner-test",
      owner: authorB,
    });
    if (!("concept" in reserveRes)) return;

    const v1 = await conceptReg.publishVersion({
      concept: reserveRes.concept,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1.tar.gz",
    });
    if (!("version" in v1)) return;

    const ownerArr = await conceptReg._getOwnerOfVersion({ version: v1.version });
    assertEquals(ownerArr.length, 1);
    assertEquals(ownerArr[0].owner, authorB);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _getOwnerOfVersion returns empty for non-existent version", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistent = "version:nonexistent" as Version;
    const ownerArr = await conceptReg._getOwnerOfVersion({ version: nonExistent });
    assertEquals(ownerArr.length, 0);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _getUniqueName returns correct name", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "named-concept",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;

    const nameArr = await conceptReg._getUniqueName({ concept: reserveRes.concept });
    assertEquals(nameArr.length, 1);
    assertEquals(nameArr[0].uniqueName, "named-concept");
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _getUniqueName returns empty for non-existent concept", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistent = "concept:nonexistent" as Concept;
    const nameArr = await conceptReg._getUniqueName({ concept: nonExistent });
    assertEquals(nameArr.length, 0);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _artifactUrlOfVersion returns correct URL", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "artifact-test",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;

    const artifactUrl = "https://artifacts.example.com/artifact-1.0.0.tar.gz";
    const v1 = await conceptReg.publishVersion({
      concept: reserveRes.concept,
      semver: "1.0.0",
      artifactUrl,
    });
    if (!("version" in v1)) return;

    const urlArr = await conceptReg._artifactUrlOfVersion({ version: v1.version });
    assertEquals(urlArr.length, 1);
    assertEquals(urlArr[0].artifactUrl, artifactUrl);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _artifactUrlOfVersion returns empty for non-existent version", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const nonExistent = "version:nonexistent" as Version;
    const urlArr = await conceptReg._artifactUrlOfVersion({ version: nonExistent });
    assertEquals(urlArr.length, 0);
  } finally {
    await client.close();
  }
}});

Deno.test({ name: "Query: _latestPublished returns most recently published version", ...testOpts, fn: async () => {
  const [db, client] = await testDb();
  const conceptReg = new ConceptRegisteringConcept(db);
  try {
    const reserveRes = await conceptReg.reserveName({
      uniqueName: "latest-test",
      owner: authorA,
    });
    if (!("concept" in reserveRes)) return;
    const conceptId = reserveRes.concept;

    // Initially no published versions
    const initial = await conceptReg._latestPublished({ concept: conceptId });
    assertEquals(initial.length, 0);

    // Publish v1
    const v1 = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "1.0.0",
      artifactUrl: "https://example.com/v1.tar.gz",
    });
    if (!("version" in v1)) return;

    // Add small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));

    // Publish v2
    const v2 = await conceptReg.publishVersion({
      concept: conceptId,
      semver: "2.0.0",
      artifactUrl: "https://example.com/v2.tar.gz",
    });
    if (!("version" in v2)) return;

    // Latest should be v2
    const latest = await conceptReg._latestPublished({ concept: conceptId });
    assertEquals(latest.length, 1);
    assertEquals(latest[0].version, v2.version);

    // Deprecate v2 (status change from PUBLISHED to DEPRECATED)
    await conceptReg.deprecate({ version: v2.version });

    // Latest PUBLISHED should now be v1
    const latestAfterDeprecate = await conceptReg._latestPublished({ concept: conceptId });
    assertEquals(latestAfterDeprecate.length, 1);
    assertEquals(latestAfterDeprecate[0].version, v1.version);
  } finally {
    await client.close();
  }
}});

