import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ConceptRegisteringConcept, {
  User,
  Concept,
  Item,
} from "./ConceptRegisteringConcept.ts";

const authorA = "user:Alice" as User;
const authorB = "user:Bob" as User;

// Disable sanitizers due to MongoDB connection cleanup timing
const testOpts = { sanitizeResources: false, sanitizeOps: false };

Deno.test({
  name: "Principle: Every registered concept has a unique name and an author; adding creates new records, changing the name updates them, and removing deletes them",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Add a concept with unique name and author
      const addRes1 = await conceptReg.add({
        unique_name: "my-concept",
        author: authorA,
      });
      assertEquals("id" in addRes1, true, "Add should succeed");
      if (!("id" in addRes1)) return;
      const conceptId1 = addRes1.id;

      // Add another concept with different unique name
      const addRes2 = await conceptReg.add({
        unique_name: "another-concept",
        author: authorB,
      });
      assertEquals("id" in addRes2, true, "Second add should succeed");
      if (!("id" in addRes2)) return;
      const conceptId2 = addRes2.id;
      assertEquals(
        conceptId1 !== conceptId2,
        true,
        "Different concepts should have different IDs",
      );

      // Change the name of the first concept
      const changeRes = await conceptReg.changeName({
        id: conceptId1,
        unique_name: "renamed-concept",
      });
      assertEquals("ok" in changeRes, true, "Change name should succeed");

      // Remove the second concept
      const removeRes = await conceptReg.remove({ id: conceptId2 });
      assertEquals("ok" in removeRes, true, "Remove should succeed");

      // Verify the first concept still exists and has the new name
      const changeAgainRes = await conceptReg.changeName({
        id: conceptId1,
        unique_name: "renamed-concept",
      });
      assertEquals(
        "ok" in changeAgainRes,
        true,
        "Changing to same name should succeed",
      );

      // Verify the second concept is gone
      const removeAgainRes = await conceptReg.remove({ id: conceptId2 });
      assertEquals(
        "error" in removeAgainRes,
        true,
        "Removing non-existent concept should fail",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: add requires unique_name is not already used",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Add first concept
      const addRes1 = await conceptReg.add({
        unique_name: "unique-concept",
        author: authorA,
      });
      assertEquals("id" in addRes1, true, "First add should succeed");

      // Try to add another concept with the same unique_name
      const addRes2 = await conceptReg.add({
        unique_name: "unique-concept",
        author: authorB,
      });
      assertEquals(
        "error" in addRes2,
        true,
        "Duplicate unique_name should fail",
      );
      if ("error" in addRes2) {
        assertEquals(
          addRes2.error.includes("already exists"),
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
  name: "Action: add requires unique_name and author",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Missing unique_name
      const res1 = await conceptReg.add({
        unique_name: "",
        author: authorA,
      });
      assertEquals("error" in res1, true, "Empty unique_name should fail");

      // Missing author
      // @ts-ignore intentional missing author
      const res2 = await conceptReg.add({
        unique_name: "test-concept",
      });
      assertEquals("error" in res2, true, "Missing author should fail");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: add creates concept with created_at and updated_at",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      const beforeTime = new Date();
      const addRes = await conceptReg.add({
        unique_name: "timestamp-test",
        author: authorA,
      });
      assertEquals("id" in addRes, true, "Add should succeed");
      if (!("id" in addRes)) return;

      const afterTime = new Date();

      // Verify timestamps were set by checking the database directly
      const collection = conceptReg.concepts;
      const doc = await collection.findOne({ _id: addRes.id });
      assertEquals(doc !== null, true, "Concept should exist in database");
      if (!doc) return;

      assertEquals(
        doc.created_at instanceof Date,
        true,
        "created_at should be a Date",
      );
      assertEquals(
        doc.updated_at instanceof Date,
        true,
        "updated_at should be a Date",
      );
      assertEquals(
        doc.created_at.getTime(),
        doc.updated_at.getTime(),
        "created_at and updated_at should be equal on creation",
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
  name: "Action: changeName requires concept exists for id",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      const nonExistentId = "concept:nonexistent" as Item;
      const res = await conceptReg.changeName({
        id: nonExistentId,
        unique_name: "new-name",
      });
      assertEquals(
        "error" in res,
        true,
        "Changing name of non-existent concept should fail",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: changeName requires unique_name is not already used",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Add two concepts
      const addRes1 = await conceptReg.add({
        unique_name: "concept-one",
        author: authorA,
      });
      assertEquals("id" in addRes1, true);
      if (!("id" in addRes1)) return;

      const addRes2 = await conceptReg.add({
        unique_name: "concept-two",
        author: authorB,
      });
      assertEquals("id" in addRes2, true);
      if (!("id" in addRes2)) return;

      // Try to change name of concept2 to concept1's name
      const changeRes = await conceptReg.changeName({
        id: addRes2.id,
        unique_name: "concept-one",
      });
      assertEquals(
        "error" in changeRes,
        true,
        "Changing to already-used name should fail",
      );

      // But changing to the same name (its own name) should succeed
      const changeToOwnName = await conceptReg.changeName({
        id: addRes2.id,
        unique_name: "concept-two",
      });
      assertEquals(
        "ok" in changeToOwnName,
        true,
        "Changing to same name should succeed",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: changeName updates unique_name and updated_at",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Add a concept
      const addRes = await conceptReg.add({
        unique_name: "original-name",
        author: authorA,
      });
      assertEquals("id" in addRes, true);
      if (!("id" in addRes)) return;

      // Get initial timestamps
      const collection = conceptReg.concepts;
      const docBefore = await collection.findOne({ _id: addRes.id });
      if (!docBefore) {
        throw new Error("Concept should exist");
      }
      const originalUpdatedAt = docBefore.updated_at.getTime();

      // Wait a bit to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));

      // Change the name
      const changeRes = await conceptReg.changeName({
        id: addRes.id,
        unique_name: "changed-name",
      });
      assertEquals("ok" in changeRes, true, "Change name should succeed");

      // Verify the name changed and updated_at was updated
      const docAfter = await collection.findOne({ _id: addRes.id });
      if (!docAfter) {
        throw new Error("Concept should still exist");
      }
      assertEquals(
        docAfter.unique_name,
        "changed-name",
        "unique_name should be updated",
      );
      assertEquals(
        docAfter.updated_at.getTime() > originalUpdatedAt,
        true,
        "updated_at should be updated",
      );
      assertEquals(
        docAfter.created_at.getTime(),
        docBefore.created_at.getTime(),
        "created_at should not change",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: changeName requires unique_name parameter",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Add a concept first
      const addRes = await conceptReg.add({
        unique_name: "test-concept",
        author: authorA,
      });
      assertEquals("id" in addRes, true);
      if (!("id" in addRes)) return;

      // Try to change name with empty string
      const res = await conceptReg.changeName({
        id: addRes.id,
        unique_name: "",
      });
      assertEquals("error" in res, true, "Empty unique_name should fail");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: remove requires concept exists for id",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      const nonExistentId = "concept:nonexistent" as Item;
      const res = await conceptReg.remove({ id: nonExistentId });
      assertEquals(
        "error" in res,
        true,
        "Removing non-existent concept should fail",
      );
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: remove deletes the concept",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // Add a concept
      const addRes = await conceptReg.add({
        unique_name: "to-be-removed",
        author: authorA,
      });
      assertEquals("id" in addRes, true);
      if (!("id" in addRes)) return;

      // Verify it exists
      const collection = conceptReg.concepts;
      const docBefore = await collection.findOne({ _id: addRes.id });
      assertEquals(docBefore !== null, true, "Concept should exist");

      // Remove it
      const removeRes = await conceptReg.remove({ id: addRes.id });
      assertEquals("ok" in removeRes, true, "Remove should succeed");

      // Verify it's gone
      const docAfter = await collection.findOne({ _id: addRes.id });
      assertEquals(docAfter === null, true, "Concept should be deleted");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "Action: remove requires id parameter",
  ...testOpts,
  fn: async () => {
    const [db, client] = await testDb();
    const conceptReg = new ConceptRegisteringConcept(db);
    try {
      // @ts-ignore intentional missing id
      const res = await conceptReg.remove({});
      assertEquals("error" in res, true, "Missing id should fail");
    } finally {
      await client.close();
    }
  },
});
