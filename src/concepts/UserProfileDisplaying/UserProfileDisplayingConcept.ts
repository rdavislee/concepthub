import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserProfileDisplaying" + ".";

// Generic type for the concept's external dependency
type User = ID;

/**
 * State: A set of Profiles with
 *   a user Users
 *   an optional displayName String
 *   an optional avatarUrl String
 *   an optional bio String
 */
interface ProfileDoc {
  _id: User; // Use user ID as the document ID for easy lookup
  user: User; // Reference to the user (matches spec: "a set of Profiles with a user Users")
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

/**
 * @concept UserProfileDisplaying
 * @purpose Present human-readable identity attributes for users (display name, avatar, bio), independent of authentication or activity.
 * @principle A user sets profile fields; others read them for display; edits update fields without affecting other concerns.
 */
export default class UserProfileDisplayingConcept {
  profiles: Collection<ProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection<ProfileDoc>(PREFIX + "profiles");
  }

  /**
   * Action: setDisplayName (user: Users, name: String) : (ok: Flag)
   * requires: user exists
   * effects: set displayName := name
   */
  async setDisplayName(
    { user, name }: { user: User; name: string },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!user) {
      return { error: "User ID is required" };
    }

    await this.profiles.updateOne(
      { _id: user },
      { $set: { user, displayName: name } },
      { upsert: true },
    );

    return { ok: true };
  }

  /**
   * Action: setAvatar (user: Users, url: String) : (ok: Flag)
   * requires: user exists
   * effects: set avatarUrl := url
   */
  async setAvatar(
    { user, url }: { user: User; url: string },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!user) {
      return { error: "User ID is required" };
    }

    await this.profiles.updateOne(
      { _id: user },
      { $set: { user, avatarUrl: url } },
      { upsert: true },
    );

    return { ok: true };
  }

  /**
   * Action: setBio (user: Users, bio: String) : (ok: Flag)
   * requires: user exists
   * effects: set bio := bio
   */
  async setBio(
    { user, bio }: { user: User; bio: string },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!user) {
      return { error: "User ID is required" };
    }

    await this.profiles.updateOne(
      { _id: user },
      { $set: { user, bio } },
      { upsert: true },
    );

    return { ok: true };
  }

  /**
   * Action: clearProfile (user: Users) : (ok: Flag)
   * requires: user exists
   * effects: unset display fields for user
   */
  async clearProfile(
    { user }: { user: User },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!user) {
      return { error: "User ID is required" };
    }

    await this.profiles.updateOne(
      { _id: user },
      { $unset: { displayName: "", avatarUrl: "", bio: "" } },
    );

    return { ok: true };
  }

  /**
   * Query: _profileOf(user: Users) : (displayName: String, avatarUrl: String, bio: String)
   * returns the profile information for the given user
   */
  async _profileOf(
    { user }: { user: User },
  ): Promise<Array<{ displayName: string; avatarUrl: string; bio: string }>> {
    const profile = await this.profiles.findOne({ _id: user });

    if (!profile) {
      // Return empty strings for all fields if profile doesn't exist
      return [{ displayName: "", avatarUrl: "", bio: "" }];
    }

    return [{
      displayName: profile.displayName || "",
      avatarUrl: profile.avatarUrl || "",
      bio: profile.bio || "",
    }];
  }
}
