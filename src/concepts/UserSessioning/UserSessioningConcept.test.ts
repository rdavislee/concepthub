import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserSessioningConcept, { Session } from "./UserSessioningConcept.ts";

Deno.test("UserSessioning: Session Lifecycle", async () => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessioningConcept(db);

  try {
    const user = "user:123" as ID;

    // 1. Begin session
    const beginResult = await sessionConcept.beginSession({ user });
    assertNotEquals("error" in beginResult, true, "Begin session should succeed");
    const { session } = beginResult as { session: Session };
    assertExists(session);

    // 2. Make request
    const req1 = await sessionConcept.makeRequest({ session });
    assertNotEquals("error" in req1, true, "Make request should succeed");
    
    const req2 = await sessionConcept.makeRequest({ session });
    assertNotEquals("error" in req2, true, "Make second request should succeed");

    // Check state directly to verify increment
    const sessionDoc = await sessionConcept.sessions.findOne({ _id: session });
    assertEquals(sessionDoc?.active_requests, 2, "Should have 2 active requests");

    // 3. End session
    const endResult = await sessionConcept.endSession({ session });
    assertNotEquals("error" in endResult, true, "End session should succeed");

    // Verify inactive
    const endedDoc = await sessionConcept.sessions.findOne({ _id: session });
    assertEquals(endedDoc?.active, false, "Session should be inactive");

    // 4. Fail to make request on ended session
    const failReq = await sessionConcept.makeRequest({ session });
    assertEquals("error" in failReq, true, "Make request on ended session should fail");

    // 5. Fail to end already ended session
    const failEnd = await sessionConcept.endSession({ session });
    assertEquals("error" in failEnd, true, "End ended session should fail");

  } finally {
    await client.close();
  }
});

