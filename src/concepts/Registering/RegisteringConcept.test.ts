import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import RegisteringConcept, {
  Concept,
  User,
} from "./RegisteringConcept.ts";

const authorA = "user:Alice" as User;
const authorB = "user:Bob" as User;

Deno.test("Principle: upload, download, and remove a registered concept", async () => {
  const [db, client] = await testDb();
  const registering = new RegisteringConcept(db);
  try {
    const uploadRes = await registering.upload({
      uniqueName: "concept-alpha",
      url: "https://files.example.com/alpha.concept",
      author: authorA,
    });
    assertEquals("id" in uploadRes, true, "Upload should succeed");
    if (!("id" in uploadRes)) return;

    const downloadRes = await registering.download({ id: uploadRes.id });
    assertEquals("error" in downloadRes, false, "Download should succeed");
    if ("error" in downloadRes) return;
    assertEquals(downloadRes.uniqueName, "concept-alpha");
    assertEquals(downloadRes.url, "https://files.example.com/alpha.concept");
    assertEquals(downloadRes.author, authorA);

    const removeRes = await registering.remove({ id: uploadRes.id });
    assertEquals("ok" in removeRes, true, "Remove should succeed");

    const afterRemoval = await registering.download({ id: uploadRes.id });
    assertEquals("error" in afterRemoval, true, "Removed concept should not download");
  } finally {
    await client.close();
  }
});

Deno.test("Action: upload enforces unique_name uniqueness", async () => {
  const [db, client] = await testDb();
  const registering = new RegisteringConcept(db);
  try {
    const first = await registering.upload({
      uniqueName: "concept-beta",
      url: "https://files.example.com/beta.concept",
      author: authorA,
    });
    assertEquals("id" in first, true, "First upload should succeed");

    const second = await registering.upload({
      uniqueName: "concept-beta",
      url: "https://files.example.com/beta-dup.concept",
      author: authorB,
    });
    assertEquals("error" in second, true, "Duplicate unique_name should fail");
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove requires existing concept id", async () => {
  const [db, client] = await testDb();
  const registering = new RegisteringConcept(db);
  try {
    const missingId = "concept:missing" as Concept;
    const res = await registering.remove({ id: missingId });
    assertEquals("error" in res, true, "Removing non-existent id should fail");
  } finally {
    await client.close();
  }
});
