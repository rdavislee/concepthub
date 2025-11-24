import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileDisplayingConcept from "./UserProfileDisplayingConcept.ts";

const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

Deno.test("Principle: A user sets profile fields; others read them for display; edits update fields without affecting other concerns", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing principle: User sets profile fields, others read them, edits update independently");

    // 1. User A sets their profile fields
    console.log("Step 1: User A sets display name");
    const setNameResult = await profileConcept.setDisplayName({
      user: userA,
      name: "Alice Smith",
    });
    assertEquals(
      "error" in setNameResult,
      false,
      "Setting display name should succeed",
    );
    assertEquals("ok" in setNameResult, true);

    console.log("Step 2: User A sets avatar URL");
    const setAvatarResult = await profileConcept.setAvatar({
      user: userA,
      url: "https://example.com/avatar.jpg",
    });
    assertEquals(
      "error" in setAvatarResult,
      false,
      "Setting avatar should succeed",
    );

    console.log("Step 3: User A sets bio");
    const setBioResult = await profileConcept.setBio({
      user: userA,
      bio: "Software engineer and cat lover",
    });
    assertEquals("error" in setBioResult, false, "Setting bio should succeed");

    // 2. Others (User B) can read the profile for display
    console.log("Step 4: User B reads User A's profile");
    const profile = await profileConcept._profileOf({ user: userA });
    assertEquals(profile.length, 1, "Query should return one profile");
    assertEquals(
      profile[0].displayName,
      "Alice Smith",
      "Display name should be set correctly",
    );
    assertEquals(
      profile[0].avatarUrl,
      "https://example.com/avatar.jpg",
      "Avatar URL should be set correctly",
    );
    assertEquals(
      profile[0].bio,
      "Software engineer and cat lover",
      "Bio should be set correctly",
    );

    // 3. Edits update fields without affecting other concerns
    console.log("Step 5: User A updates only the display name");
    const updateNameResult = await profileConcept.setDisplayName({
      user: userA,
      name: "Alice J. Smith",
    });
    assertEquals(
      "error" in updateNameResult,
      false,
      "Updating display name should succeed",
    );

    // Verify that only displayName changed, other fields remain unchanged
    const updatedProfile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      updatedProfile[0].displayName,
      "Alice J. Smith",
      "Display name should be updated",
    );
    assertEquals(
      updatedProfile[0].avatarUrl,
      "https://example.com/avatar.jpg",
      "Avatar URL should remain unchanged",
    );
    assertEquals(
      updatedProfile[0].bio,
      "Software engineer and cat lover",
      "Bio should remain unchanged",
    );

    console.log("✓ Principle test passed: Fields can be set independently and read by others");
  } finally {
    await client.close();
  }
});

Deno.test("Action: setDisplayName requires user exists and effects set displayName", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing setDisplayName action");

    // Test requires: user must be provided
    console.log("Testing requires: user ID is required");
    const missingUserResult = await profileConcept.setDisplayName({
      user: "" as ID,
      name: "Test Name",
    });
    assertEquals(
      "error" in missingUserResult,
      true,
      "Should fail when user ID is empty",
    );

    // Test effects: displayName is set correctly
    console.log("Testing effects: displayName is set");
    const result = await profileConcept.setDisplayName({
      user: userA,
      name: "Test Display Name",
    });
    assertEquals(
      "error" in result,
      false,
      "Setting display name with valid user should succeed",
    );
    assertEquals("ok" in result, true);

    // Verify the effect using the query
    const profile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      profile[0].displayName,
      "Test Display Name",
      "Display name should be set to the provided value",
    );

    // Test that updating displayName works
    console.log("Testing update: displayName can be changed");
    await profileConcept.setDisplayName({
      user: userA,
      name: "Updated Name",
    });
    const updatedProfile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      updatedProfile[0].displayName,
      "Updated Name",
      "Display name should be updated",
    );

    console.log("✓ setDisplayName action test passed");
  } finally {
    await client.close();
  }
});

Deno.test("Action: setAvatar requires user exists and effects set avatarUrl", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing setAvatar action");

    // Test requires: user must be provided
    console.log("Testing requires: user ID is required");
    const missingUserResult = await profileConcept.setAvatar({
      user: "" as ID,
      url: "https://example.com/avatar.jpg",
    });
    assertEquals(
      "error" in missingUserResult,
      true,
      "Should fail when user ID is empty",
    );

    // Test effects: avatarUrl is set correctly
    console.log("Testing effects: avatarUrl is set");
    const result = await profileConcept.setAvatar({
      user: userA,
      url: "https://example.com/avatar.jpg",
    });
    assertEquals(
      "error" in result,
      false,
      "Setting avatar with valid user should succeed",
    );
    assertEquals("ok" in result, true);

    // Verify the effect using the query
    const profile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      profile[0].avatarUrl,
      "https://example.com/avatar.jpg",
      "Avatar URL should be set to the provided value",
    );

    // Test that updating avatarUrl works
    console.log("Testing update: avatarUrl can be changed");
    await profileConcept.setAvatar({
      user: userA,
      url: "https://example.com/new-avatar.png",
    });
    const updatedProfile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      updatedProfile[0].avatarUrl,
      "https://example.com/new-avatar.png",
      "Avatar URL should be updated",
    );

    console.log("✓ setAvatar action test passed");
  } finally {
    await client.close();
  }
});

Deno.test("Action: setBio requires user exists and effects set bio", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing setBio action");

    // Test requires: user must be provided
    console.log("Testing requires: user ID is required");
    const missingUserResult = await profileConcept.setBio({
      user: "" as ID,
      bio: "Test bio",
    });
    assertEquals(
      "error" in missingUserResult,
      true,
      "Should fail when user ID is empty",
    );

    // Test effects: bio is set correctly
    console.log("Testing effects: bio is set");
    const result = await profileConcept.setBio({
      user: userA,
      bio: "This is a test bio",
    });
    assertEquals(
      "error" in result,
      false,
      "Setting bio with valid user should succeed",
    );
    assertEquals("ok" in result, true);

    // Verify the effect using the query
    const profile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      profile[0].bio,
      "This is a test bio",
      "Bio should be set to the provided value",
    );

    // Test that updating bio works
    console.log("Testing update: bio can be changed");
    await profileConcept.setBio({
      user: userA,
      bio: "Updated bio text",
    });
    const updatedProfile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      updatedProfile[0].bio,
      "Updated bio text",
      "Bio should be updated",
    );

    console.log("✓ setBio action test passed");
  } finally {
    await client.close();
  }
});

Deno.test("Action: clearProfile requires user exists and effects unset display fields", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing clearProfile action");

    // First, set some profile fields
    await profileConcept.setDisplayName({ user: userA, name: "Test Name" });
    await profileConcept.setAvatar({
      user: userA,
      url: "https://example.com/avatar.jpg",
    });
    await profileConcept.setBio({ user: userA, bio: "Test bio" });

    // Verify fields are set
    let profile = await profileConcept._profileOf({ user: userA });
    assertEquals(profile[0].displayName, "Test Name");
    assertEquals(profile[0].avatarUrl, "https://example.com/avatar.jpg");
    assertEquals(profile[0].bio, "Test bio");

    // Test requires: user must be provided
    console.log("Testing requires: user ID is required");
    const missingUserResult = await profileConcept.clearProfile({
      user: "" as ID,
    });
    assertEquals(
      "error" in missingUserResult,
      true,
      "Should fail when user ID is empty",
    );

    // Test effects: all display fields are unset
    console.log("Testing effects: display fields are cleared");
    const result = await profileConcept.clearProfile({ user: userA });
    assertEquals(
      "error" in result,
      false,
      "Clearing profile with valid user should succeed",
    );
    assertEquals("ok" in result, true);

    // Verify the effect using the query
    profile = await profileConcept._profileOf({ user: userA });
    assertEquals(
      profile[0].displayName,
      "",
      "Display name should be cleared (empty string)",
    );
    assertEquals(
      profile[0].avatarUrl,
      "",
      "Avatar URL should be cleared (empty string)",
    );
    assertEquals(profile[0].bio, "", "Bio should be cleared (empty string)");

    console.log("✓ clearProfile action test passed");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _profileOf returns profile information or empty strings if profile doesn't exist", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing _profileOf query");

    // Test query for non-existent profile returns empty strings
    console.log("Testing: non-existent profile returns empty strings");
    const emptyProfile = await profileConcept._profileOf({ user: userB });
    assertEquals(emptyProfile.length, 1, "Query should return one result");
    assertEquals(
      emptyProfile[0].displayName,
      "",
      "Display name should be empty string for non-existent profile",
    );
    assertEquals(
      emptyProfile[0].avatarUrl,
      "",
      "Avatar URL should be empty string for non-existent profile",
    );
    assertEquals(
      emptyProfile[0].bio,
      "",
      "Bio should be empty string for non-existent profile",
    );

    // Set some profile fields
    await profileConcept.setDisplayName({ user: userB, name: "Bob Johnson" });
    await profileConcept.setAvatar({
      user: userB,
      url: "https://example.com/bob.jpg",
    });
    await profileConcept.setBio({ user: userB, bio: "Bob's bio" });

    // Test query returns correct values
    console.log("Testing: existing profile returns correct values");
    const profile = await profileConcept._profileOf({ user: userB });
    assertEquals(profile.length, 1, "Query should return one result");
    assertEquals(
      profile[0].displayName,
      "Bob Johnson",
      "Display name should match",
    );
    assertEquals(
      profile[0].avatarUrl,
      "https://example.com/bob.jpg",
      "Avatar URL should match",
    );
    assertEquals(profile[0].bio, "Bob's bio", "Bio should match");

    // Test partial profile (only some fields set)
    console.log("Testing: partial profile returns correct values");
    await profileConcept.clearProfile({ user: userB });
    await profileConcept.setDisplayName({ user: userB, name: "Bob" });
    const partialProfile = await profileConcept._profileOf({ user: userB });
    assertEquals(
      partialProfile[0].displayName,
      "Bob",
      "Set field should return value",
    );
    assertEquals(
      partialProfile[0].avatarUrl,
      "",
      "Unset field should return empty string",
    );
    assertEquals(
      partialProfile[0].bio,
      "",
      "Unset field should return empty string",
    );

    console.log("✓ _profileOf query test passed");
  } finally {
    await client.close();
  }
});

Deno.test("Independent field updates: editing one field does not affect others", async () => {
  const [db, client] = await testDb();
  const profileConcept = new UserProfileDisplayingConcept(db);

  try {
    console.log("Testing that field updates are independent");

    // Set all fields initially
    await profileConcept.setDisplayName({ user: userA, name: "Initial Name" });
    await profileConcept.setAvatar({
      user: userA,
      url: "https://example.com/initial.jpg",
    });
    await profileConcept.setBio({ user: userA, bio: "Initial bio" });

    // Update only displayName
    console.log("Updating only displayName");
    await profileConcept.setDisplayName({ user: userA, name: "Updated Name" });
    let profile = await profileConcept._profileOf({ user: userA });
    assertEquals(profile[0].displayName, "Updated Name");
    assertEquals(profile[0].avatarUrl, "https://example.com/initial.jpg");
    assertEquals(profile[0].bio, "Initial bio");

    // Update only avatarUrl
    console.log("Updating only avatarUrl");
    await profileConcept.setAvatar({
      user: userA,
      url: "https://example.com/new.jpg",
    });
    profile = await profileConcept._profileOf({ user: userA });
    assertEquals(profile[0].displayName, "Updated Name");
    assertEquals(profile[0].avatarUrl, "https://example.com/new.jpg");
    assertEquals(profile[0].bio, "Initial bio");

    // Update only bio
    console.log("Updating only bio");
    await profileConcept.setBio({ user: userA, bio: "Updated bio" });
    profile = await profileConcept._profileOf({ user: userA });
    assertEquals(profile[0].displayName, "Updated Name");
    assertEquals(profile[0].avatarUrl, "https://example.com/new.jpg");
    assertEquals(profile[0].bio, "Updated bio");

    console.log("✓ Independent field updates test passed");
  } finally {
    await client.close();
  }
});

