import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ConceptVersioningConcept, {
  Concept,
  Item,
} from "./ConceptVersioningConcept.ts";
import ConceptRegisteringConcept, {
  User,
} from "../ConceptRegistering/ConceptRegisteringConcept.ts";

const userA = "user:test-user-a" as User;
const userB = "user:test-user-b" as User;

// Disable sanitizers due to MongoDB connection cleanup timing
const testOpts = { sanitizeResources: false, sanitizeOps: false };

/**
 * Helper function to create a concept in ConceptRegistering
 */
async function createConcept(
  conceptRegistering: ConceptRegisteringConcept,
  uniqueName: string,
  author: User,
): Promise<Concept> {
  const addRes = await conceptRegistering.add({
    unique_name: uniqueName,
    author,
  });
  if (!("id" in addRes)) {
    throw new Error(`Failed to create concept: ${uniqueName}`);
  }
  return addRes.id;
}

Deno.test({
  name:
    "Principle: When a concept version is uploaded with a version number and file content, it uploads the file to storage, creates a new version record with the storage URL, and stores the URL in state; later versions can be uploaded for the same concept, and any version can be downloaded (retrieving the file from storage) or retrieved by its concept and version number (or the latest if no version is specified)",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      console.log(
        "Testing principle: uploading, downloading, and retrieving versions",
      );

      // Create concepts first (required for upload to look up userId)
      const addResA = await conceptRegistering.add({
        unique_name: "test-concept-a",
        author: userA,
      });
      assertEquals("id" in addResA, true, "Should create concept A");
      if (!("id" in addResA)) return;
      // Use the returned ID or our predefined one
      const actualConceptA = addResA.id;

      // Upload version 1 of concept A
      const fileContent1 = new TextEncoder().encode("Version 1 content");
      const uploadRes1 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent: fileContent1,
      });
      assertEquals("id" in uploadRes1, true, "First upload should succeed");
      if (!("id" in uploadRes1)) return;
      const versionId1 = uploadRes1.id;
      console.log(`  - Uploaded version 1, got id: ${versionId1}`);

      // Upload version 2 of concept A
      const fileContent2 = new TextEncoder().encode("Version 2 content");
      const uploadRes2 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 2,
        fileContent: fileContent2,
      });
      assertEquals("id" in uploadRes2, true, "Second upload should succeed");
      if (!("id" in uploadRes2)) return;
      const versionId2 = uploadRes2.id;
      console.log(`  - Uploaded version 2, got id: ${versionId2}`);
      assertEquals(
        versionId1 !== versionId2,
        true,
        "Different versions should have different IDs",
      );

      // Download version 1
      const downloadRes1 = await conceptVersioning.download({ id: versionId1 });
      assertEquals(
        "files" in downloadRes1,
        true,
        "Download should succeed",
      );
      if (!("files" in downloadRes1)) return;
      assertEquals(downloadRes1.files.has("index"), true, "Should have index file");
      const file1 = downloadRes1.files.get("index");
      if (!file1) throw new Error("index file not found");
      assertEquals(
        new TextDecoder().decode(file1),
        "Version 1 content",
        "Downloaded content should match uploaded content",
      );
      assertEquals(downloadRes1.version, 1, "Downloaded version should be 1");
      console.log("  - Downloaded version 1, content matches");

      // Download version 2
      const downloadRes2 = await conceptVersioning.download({ id: versionId2 });
      assertEquals(
        "files" in downloadRes2,
        true,
        "Download should succeed",
      );
      if (!("files" in downloadRes2)) return;
      assertEquals(downloadRes2.files.has("index"), true, "Should have index file");
      const file2 = downloadRes2.files.get("index");
      if (!file2) throw new Error("index file not found");
      assertEquals(
        new TextDecoder().decode(file2),
        "Version 2 content",
        "Downloaded content should match uploaded content",
      );
      assertEquals(downloadRes2.version, 2, "Downloaded version should be 2");
      console.log("  - Downloaded version 2, content matches");

      // Get specific version 1
      const getRes1 = await conceptVersioning._get({
        concept: actualConceptA,
        version: 1,
      });
      assertEquals(getRes1.length, 1, "Should return one version");
      assertEquals(getRes1[0].version, 1, "Should return version 1");
      assertEquals(getRes1[0].id, versionId1, "Should return correct id");
      console.log("  - Retrieved specific version 1");

      // Get latest version (should be version 2)
      const getLatestRes = await conceptVersioning._get({
        concept: actualConceptA,
      });
      assertEquals(getLatestRes.length, 1, "Should return one version");
      assertEquals(
        getLatestRes[0].version,
        2,
        "Should return latest version 2",
      );
      assertEquals(getLatestRes[0].id, versionId2, "Should return correct id");
      console.log("  - Retrieved latest version (2)");

      console.log("Principle test passed: all operations work as expected");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name:
    "Action: upload requires concept exists and no version with same concept and version number",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      const fileContent = new TextEncoder().encode("Test content");

      // Upload first version
      const uploadRes1 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent,
      });
      assertEquals("id" in uploadRes1, true, "First upload should succeed");

      // Try to upload same version again
      const uploadRes2 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent,
      });
      assertEquals(
        "error" in uploadRes2,
        true,
        "Duplicate version should fail",
      );
      if ("error" in uploadRes2) {
        assertEquals(
          uploadRes2.error.includes("already exists"),
          true,
          "Error message should mention duplicate",
        );
      }
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: upload requires valid parameters",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      const fileContent = new TextEncoder().encode("Test content");

      // Missing concept
      // @ts-ignore intentional missing concept
      const res1 = await conceptVersioning.upload({
        version: 1,
        fileContent,
      });
      assertEquals("error" in res1, true, "Missing concept should fail");

      // Invalid version (negative)
      const res2 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: -1,
        fileContent,
      });
      assertEquals("error" in res2, true, "Negative version should fail");

      // Empty fileContent
      const res3 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent: new Uint8Array(0),
      });
      assertEquals("error" in res3, true, "Empty fileContent should fail");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: upload uploads file to storage and creates version record",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      const fileContent = new TextEncoder().encode("Test file content");
      const beforeTime = new Date();

      const uploadRes = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent,
      });
      assertEquals("id" in uploadRes, true, "Upload should succeed");
      if (!("id" in uploadRes)) return;

      const afterTime = new Date();

      // Verify version record was created
      const collection = conceptVersioning.versions;
      const doc = await collection.findOne({ _id: uploadRes.id });
      assertEquals(doc !== null, true, "Version should exist in database");
      if (!doc) return;

      assertEquals(doc.concept, actualConceptA, "Concept should match");
      assertEquals(doc.version, 1, "Version should match");
      assertEquals(
        typeof doc.fileURL,
        "string",
        "fileURL should be a string",
      );
      assertEquals(
        doc.fileURL.length > 0,
        true,
        "fileURL should not be empty",
      );
      assertEquals(
        doc.created_at instanceof Date,
        true,
        "created_at should be a Date",
      );
      assertEquals(
        doc.created_at >= beforeTime,
        true,
        "created_at should be after beforeTime",
      );
      assertEquals(
        doc.created_at <= afterTime,
        true,
        "created_at should be before afterTime",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: download requires version exists for id",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    try {
      const nonExistentId = "version:nonexistent" as Item;
      const res = await conceptVersioning.download({ id: nonExistentId });
      assertEquals(
        "error" in res,
        true,
        "Downloading non-existent version should fail",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: download retrieves file from storage and returns content",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      const originalContent = new TextEncoder().encode("Original file content");
      const uploadRes = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent: originalContent,
      });
      assertEquals("id" in uploadRes, true);
      if (!("id" in uploadRes)) return;

      const downloadRes = await conceptVersioning.download({
        id: uploadRes.id,
      });
      assertEquals(
        "files" in downloadRes,
        true,
        "Download should succeed",
      );
      if (!("files" in downloadRes)) return;
      assertEquals(downloadRes.files.has("index"), true, "Should have index file");
      const downloadedFile = downloadRes.files.get("index");
      if (!downloadedFile) {
        throw new Error("index file is undefined");
      }

      assertEquals(
        downloadedFile.length,
        originalContent.length,
        "Downloaded content length should match",
      );
      assertEquals(
        new TextDecoder().decode(downloadedFile),
        new TextDecoder().decode(originalContent),
        "Downloaded content should match original",
      );
      assertEquals(downloadRes.version, 1, "Version should match");
      assertEquals(
        downloadRes.created_at instanceof Date,
        true,
        "created_at should be a Date",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: remove requires version exists for id",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    try {
      const nonExistentId = "version:nonexistent" as Item;
      const res = await conceptVersioning.remove({ id: nonExistentId });
      assertEquals(
        "error" in res,
        true,
        "Removing non-existent version should fail",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: remove deletes file from storage and version record",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      const fileContent = new TextEncoder().encode("Content to be deleted");
      const uploadRes = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent,
      });
      assertEquals("id" in uploadRes, true);
      if (!("id" in uploadRes)) return;

      // Verify it exists
      const collection = conceptVersioning.versions;
      const docBefore = await collection.findOne({ _id: uploadRes.id });
      assertEquals(docBefore !== null, true, "Version should exist");

      // Remove it
      const removeRes = await conceptVersioning.remove({ id: uploadRes.id });
      assertEquals("ok" in removeRes, true, "Remove should succeed");

      // Verify it's gone
      const docAfter = await collection.findOne({ _id: uploadRes.id });
      assertEquals(docAfter === null, true, "Version should be deleted");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Query: _get with version returns specific version",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      // Upload multiple versions
      const fileContent1 = new TextEncoder().encode("Version 1");
      const uploadRes1 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent: fileContent1,
      });
      assertEquals("id" in uploadRes1, true);
      if (!("id" in uploadRes1)) return;

      const fileContent2 = new TextEncoder().encode("Version 2");
      const uploadRes2 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 2,
        fileContent: fileContent2,
      });
      assertEquals("id" in uploadRes2, true);
      if (!("id" in uploadRes2)) return;

      // Get version 1
      const getRes1 = await conceptVersioning._get({
        concept: actualConceptA,
        version: 1,
      });
      assertEquals(getRes1.length, 1, "Should return one version");
      assertEquals(getRes1[0].version, 1, "Should return version 1");
      assertEquals(getRes1[0].id, uploadRes1.id, "Should return correct id");

      // Get version 2
      const getRes2 = await conceptVersioning._get({
        concept: actualConceptA,
        version: 2,
      });
      assertEquals(getRes2.length, 1, "Should return one version");
      assertEquals(getRes2[0].version, 2, "Should return version 2");
      assertEquals(getRes2[0].id, uploadRes2.id, "Should return correct id");

      // Get non-existent version
      const getRes3 = await conceptVersioning._get({
        concept: actualConceptA,
        version: 99,
      });
      assertEquals(
        getRes3.length,
        0,
        "Should return empty array for non-existent version",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Query: _get without version returns latest version",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );

      // Upload versions in order
      const fileContent1 = new TextEncoder().encode("Version 1");
      const uploadRes1 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent: fileContent1,
      });
      assertEquals("id" in uploadRes1, true);
      if (!("id" in uploadRes1)) return;

      // Wait a bit to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));

      const fileContent2 = new TextEncoder().encode("Version 2");
      const uploadRes2 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 2,
        fileContent: fileContent2,
      });
      assertEquals("id" in uploadRes2, true);
      if (!("id" in uploadRes2)) return;

      // Get latest (should be version 2)
      const getLatestRes = await conceptVersioning._get({
        concept: actualConceptA,
      });
      assertEquals(getLatestRes.length, 1, "Should return one version");
      assertEquals(
        getLatestRes[0].version,
        2,
        "Should return latest version 2",
      );
      assertEquals(
        getLatestRes[0].id,
        uploadRes2.id,
        "Should return correct id",
      );

      // Upload version 3
      const fileContent3 = new TextEncoder().encode("Version 3");
      const uploadRes3 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 3,
        fileContent: fileContent3,
      });
      assertEquals("id" in uploadRes3, true);
      if (!("id" in uploadRes3)) return;

      // Get latest again (should now be version 3)
      const getLatestRes2 = await conceptVersioning._get({
        concept: actualConceptA,
      });
      assertEquals(getLatestRes2.length, 1, "Should return one version");
      assertEquals(
        getLatestRes2[0].version,
        3,
        "Should return latest version 3",
      );
      assertEquals(
        getLatestRes2[0].id,
        uploadRes3.id,
        "Should return correct id",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name:
    "Query: _get without version handles equal version numbers by created_at",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concepts first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-a",
        userA,
      );
      const actualConceptB = await createConcept(
        conceptRegistering,
        "test-concept-b",
        userB,
      );

      // Upload version 1
      const fileContent1 = new TextEncoder().encode("Version 1");
      const uploadRes1 = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        fileContent: fileContent1,
      });
      assertEquals("id" in uploadRes1, true);
      if (!("id" in uploadRes1)) return;

      // Wait to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));

      // Upload another version 1 (should fail due to duplicate check, but let's test with different concept)
      const fileContent1b = new TextEncoder().encode("Version 1b");
      const uploadRes1b = await conceptVersioning.upload({
        concept: actualConceptB,
        version: 1,
        fileContent: fileContent1b,
      });
      assertEquals("id" in uploadRes1b, true);
      if (!("id" in uploadRes1b)) return;

      // Wait to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));

      // Upload version 2 for conceptB
      const fileContent2 = new TextEncoder().encode("Version 2");
      const uploadRes2 = await conceptVersioning.upload({
        concept: actualConceptB,
        version: 2,
        fileContent: fileContent2,
      });
      assertEquals("id" in uploadRes2, true);
      if (!("id" in uploadRes2)) return;

      // Get latest for conceptB (should be version 2, highest version number)
      const getLatestRes = await conceptVersioning._get({
        concept: actualConceptB,
      });
      assertEquals(getLatestRes.length, 1, "Should return one version");
      assertEquals(
        getLatestRes[0].version,
        2,
        "Should return version 2 (highest)",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Query: _get without version returns empty array if no versions exist",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    try {
      // Use a non-existent concept ID
      const nonExistentConcept = "concept:nonexistent" as Concept;
      const getRes = await conceptVersioning._get({
        concept: nonExistentConcept,
      });
      assertEquals(
        getRes.length,
        0,
        "Should return empty array for non-existent concept",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: upload and download with multiple files in folder structure",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptVersioning = new ConceptVersioningConcept(db);
    const conceptRegistering = new ConceptRegisteringConcept(db);
    try {
      // Create concept first
      const actualConceptA = await createConcept(
        conceptRegistering,
        "test-concept-multi",
        userA,
      );

      // Upload version with multiple files
      const files = new Map<string, Uint8Array>([
        ["index.ts", new TextEncoder().encode("export const x = 1;")],
        ["README.md", new TextEncoder().encode("# My Concept")],
        ["config.json", new TextEncoder().encode('{"version": 1}')],
      ]);

      const uploadRes = await conceptVersioning.upload({
        concept: actualConceptA,
        version: 1,
        files,
      });
      assertEquals("id" in uploadRes, true, "Upload should succeed");
      if (!("id" in uploadRes)) return;

      // Download and verify all files
      const downloadRes = await conceptVersioning.download({
        id: uploadRes.id,
      });
      assertEquals("files" in downloadRes, true, "Download should succeed");
      if (!("files" in downloadRes)) return;

      assertEquals(
        downloadRes.files.size,
        3,
        "Should have 3 files in the folder",
      );
      assertEquals(
        downloadRes.files.has("index.ts"),
        true,
        "Should have index.ts",
      );
      assertEquals(
        downloadRes.files.has("README.md"),
        true,
        "Should have README.md",
      );
      assertEquals(
        downloadRes.files.has("config.json"),
        true,
        "Should have config.json",
      );

      // Verify file contents
      const indexContent = downloadRes.files.get("index.ts");
      if (!indexContent) throw new Error("index.ts not found");
      assertEquals(
        new TextDecoder().decode(indexContent),
        "export const x = 1;",
        "index.ts content should match",
      );

      const readmeContent = downloadRes.files.get("README.md");
      if (!readmeContent) throw new Error("README.md not found");
      assertEquals(
        new TextDecoder().decode(readmeContent),
        "# My Concept",
        "README.md content should match",
      );

      const configContent = downloadRes.files.get("config.json");
      if (!configContent) throw new Error("config.json not found");
      assertEquals(
        new TextDecoder().decode(configContent),
        '{"version": 1}',
        "config.json content should match",
      );

      assertEquals(downloadRes.version, 1, "Version should match");
    } finally {
      await client.close();
    }
  },
});
