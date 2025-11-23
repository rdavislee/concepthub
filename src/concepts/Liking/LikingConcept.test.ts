import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts"; // imported for potential future explicit typing of returned IDs
import LikingConcept, { Item, User } from "./LikingConcept.ts";

const userA = "user:Alice" as User;
const userB = "user:Bob" as User;
const itemX = "item:X" as Item;
const itemY = "item:Y" as Item;

Deno.test("Principle: user likes then unlikes an item (binary preference)", async () => {
  const [db, client] = await testDb();
  const liking = new LikingConcept(db);
  try {
    // Like itemX by userA
    const likeRes = await liking.like({ item: itemX, user: userA });
    assertEquals("ok" in likeRes, true, "First like should succeed");
    // Confirm _isLiked returns true
    const likedArr = await liking._isLiked({ item: itemX, user: userA });
    assertEquals(likedArr.length, 1);
    assertEquals(likedArr[0].liked, true);
    // Attempt duplicate like (should error)
    const dupRes = await liking.like({ item: itemX, user: userA });
    assertEquals("error" in dupRes, true, "Duplicate like should fail");
    // Unlike
    const unlikeRes = await liking.unlike({ item: itemX, user: userA });
    assertEquals("ok" in unlikeRes, true, "Unlike should succeed");
    // Confirm not liked
    const afterUnlike = await liking._isLiked({ item: itemX, user: userA });
    assertEquals(afterUnlike[0].liked, false);
  } finally {
    await client.close();
  }
});

Deno.test("Action: like enforces no existing like precondition", async () => {
  const [db, client] = await testDb();
  const liking = new LikingConcept(db);
  try {
    await liking.like({ item: itemY, user: userB });
    const res = await liking.like({ item: itemY, user: userB });
    assertEquals("error" in res, true, "Second like must fail");
  } finally {
    await client.close();
  }
});

Deno.test("Action: unlike requires existing like", async () => {
  const [db, client] = await testDb();
  const liking = new LikingConcept(db);
  try {
    const res = await liking.unlike({ item: itemX, user: userA });
    assertEquals("error" in res, true, "Unliking without like should fail");
  } finally {
    await client.close();
  }
});

Deno.test("Query _count reflects number of likes", async () => {
  const [db, client] = await testDb();
  const liking = new LikingConcept(db);
  try {
    // Initially zero
    const initial = await liking._count({ item: itemX });
    assertEquals(initial[0].n, 0);
    // Add two distinct user likes
    await liking.like({ item: itemX, user: userA });
    await liking.like({ item: itemX, user: userB });
    const after = await liking._count({ item: itemX });
    assertEquals(after[0].n, 2);
    // Remove one
    await liking.unlike({ item: itemX, user: userA });
    const finalCount = await liking._count({ item: itemX });
    assertEquals(finalCount[0].n, 1);
  } finally {
    await client.close();
  }
});
