import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import DownloadAnalyzingConcept, { Item, User } from "./DownloadAnalyzingConcept.ts";

const userA = "user:Alice" as User;
const userB = "user:Bob" as User;
const itemX = "item:X" as Item;
const itemY = "item:Y" as Item;

Deno.test("Principle: record downloads and analyze counts & recency", async () => {
  const [db, client] = await testDb();
  const da = new DownloadAnalyzingConcept(db);
  try {
    const now = new Date();
    // Record three downloads for itemX by two users
    const r1 = await da.record({ item: itemX, user: userA, at: new Date(now.getTime() - 10_000) });
    assertEquals("download" in r1, true);
    const r2 = await da.record({ item: itemX, user: userB, at: new Date(now.getTime() - 5_000) });
    assertEquals("download" in r2, true);
    const r3 = await da.record({ item: itemX, user: userA, at: now });
    assertEquals("download" in r3, true);
    // Count in time window
    const from = new Date(now.getTime() - 20_000);
    const to = new Date(now.getTime() + 1_000);
    const countArr = await da._countForItem({ item: itemX, from, to });
    assertEquals(countArr[0].count, 3);
    // Recent list for userA (should be 2)
    const recentA = await da._recentForUser({ user: userA });
    assertEquals(recentA.length, 2);
  } finally {
    await client.close();
  }
});

Deno.test("Action: record requires all fields present", async () => {
  const [db, client] = await testDb();
  const da = new DownloadAnalyzingConcept(db);
  try {
    // Missing timestamp
    // @ts-ignore intentional missing at
    const res = await da.record({ item: itemY, user: userA });
    assertEquals("error" in res, true);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _countForItem zero when out of range", async () => {
  const [db, client] = await testDb();
  const da = new DownloadAnalyzingConcept(db);
  try {
    const now = new Date();
    await da.record({ item: itemY, user: userA, at: now });
    const early = new Date(now.getTime() - 60_000);
    const late = new Date(now.getTime() - 30_000); // window before download
    const arr = await da._countForItem({ item: itemY, from: early, to: late });
    assertEquals(arr[0].count, 0);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _recentForUser limit parameter", async () => {
  const [db, client] = await testDb();
  const da = new DownloadAnalyzingConcept(db);
  try {
    const base = Date.now();
    for (let i = 0; i < 10; i++) {
      await da.record({ item: ("item:" + i) as Item, user: userB, at: new Date(base + i) });
    }
    const limited = await da._recentForUser({ user: userB, limit: 5 });
    assertEquals(limited.length, 5);
  } finally {
    await client.close();
  }
});
