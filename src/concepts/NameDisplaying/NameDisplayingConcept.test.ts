import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import NameDisplayingConcept, {
  Concept,
} from "./NameDisplayingConcept.ts";

const conceptA = "concept:A" as Concept;
const conceptB = "concept:B" as Concept;

Deno.test("Principle: change_name upserts and remove clears entries", async () => {
  const [db, client] = await testDb();
  const names = new NameDisplayingConcept(db);
  try {
    const first = await names.change_name({
      conceptId: conceptA,
      displayName: "Alpha Concept",
    });
    assertEquals("ok" in first, true, "Initial change_name should succeed");

    const updated = await names.change_name({
      conceptId: conceptA,
      displayName: "Alpha Concept v2",
    });
    assertEquals("ok" in updated, true, "Updating name should succeed");

    const searchRes = await names.search({ text: "Alpha" });
    assertEquals(searchRes.length, 1);
    assertEquals(searchRes[0].conceptId, conceptA);
    assertEquals(searchRes[0].displayName, "Alpha Concept v2");

    const removeRes = await names.remove({ conceptId: conceptA });
    assertEquals("ok" in removeRes, true, "Remove should succeed");

    const afterRemove = await names.search({ text: "Alpha" });
    assertEquals(afterRemove.length, 0, "Search should find nothing after removal");
  } finally {
    await client.close();
  }
});

Deno.test("Action: change_name requires non-empty display_name", async () => {
  const [db, client] = await testDb();
  const names = new NameDisplayingConcept(db);
  try {
    const res = await names.change_name({ conceptId: conceptB, displayName: "   " });
    assertEquals("error" in res, true, "Blank display_name should fail");
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove requires existing concept_id", async () => {
  const [db, client] = await testDb();
  const names = new NameDisplayingConcept(db);
  try {
    const res = await names.remove({ conceptId: "concept:missing" as Concept });
    assertEquals("error" in res, true, "Removing missing concept should fail");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search matches case-insensitively and supports partials", async () => {
  const [db, client] = await testDb();
  const names = new NameDisplayingConcept(db);
  try {
    await names.change_name({ conceptId: conceptA, displayName: "Gamma Ray" });
    await names.change_name({ conceptId: conceptB, displayName: "Great Expectations" });

    const res = await names.search({ text: "gra" });
    assertEquals(res.length, 2, "Both names match 'gra' case-insensitively");
    const ids = res.map((r) => r.conceptId).sort();
    assertEquals(ids, [conceptA, conceptB].sort());
  } finally {
    await client.close();
  }
});
