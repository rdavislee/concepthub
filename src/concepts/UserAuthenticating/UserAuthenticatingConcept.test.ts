import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticatingConcept, { User } from "./UserAuthenticatingConcept.ts";

Deno.test("UserAuthenticating: Register and Authenticate Flow", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticatingConcept(db);

  try {
    const email = "test@example.com";
    const password = "securePassword123";

    // 1. Register a new user
    const registerResult = await authConcept.register({ email, password });
    assertNotEquals("error" in registerResult, true, "Registration should succeed");
    const { user: userId } = registerResult as { user: User };
    assertExists(userId);

    // 2. Fail to register duplicate
    const duplicateResult = await authConcept.register({ email, password });
    assertEquals("error" in duplicateResult, true, "Duplicate registration should fail");

    // 3. Authenticate successfully
    const authResult = await authConcept.authenticate({ email, password });
    assertNotEquals("error" in authResult, true, "Authentication should succeed");
    
    if ("user" in authResult) {
        const { user } = authResult;
        assertEquals(user.email, email);
        assertExists(user.access_token);
        assertExists(user.refresh_token);
        assertEquals(user._id, userId);
    }

    // 4. Fail authentication with wrong password
    const wrongPassResult = await authConcept.authenticate({ email, password: "wrong" });
    assertEquals("error" in wrongPassResult, true, "Auth with wrong password should fail");

    // 5. Fail authentication with non-existent user
    const noUserResult = await authConcept.authenticate({ email: "nobody@example.com", password });
    assertEquals("error" in noUserResult, true, "Auth with unknown user should fail");

  } finally {
    await client.close();
  }
});

