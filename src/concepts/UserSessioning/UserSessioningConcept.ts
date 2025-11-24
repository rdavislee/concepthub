import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "UserSessioning.";

export type User = ID;
export type Session = ID;

interface SessionDoc {
  _id: Session;
  user: User;
  active_requests: number;
  active: boolean;
}

/**
 * @concept UserSessioning
 * @purpose Maintain authenticated active sessions and track request activity.
 */
export default class UserSessioningConcept {
  sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * Action: Begin a new session for a user.
   * @requires User must be provided.
   * @effects Creates a new active session with 0 requests.
   */
  async beginSession(
    { user }: { user: User },
  ): Promise<{ session: Session } | { error: string }> {
    if (!user) {
      return { error: "User is required." };
    }

    const sessionId = freshID() as Session;
    await this.sessions.insertOne({
      _id: sessionId,
      user,
      active_requests: 0,
      active: true,
    });

    return { session: sessionId };
  }

  /**
   * Action: End an existing session.
   * @requires Session must exist and be active.
   * @effects Sets session to inactive.
   */
  async endSession(
    { session }: { session: Session },
  ): Promise<{ ok: boolean } | { error: string }> {
    const result = await this.sessions.updateOne(
      { _id: session, active: true },
      { $set: { active: false } },
    );

    if (result.matchedCount === 0) {
      return { error: "Session not found or already ended." };
    }

    return { ok: true };
  }

  /**
   * Action: Record a request made during a session.
   * @requires Session must exist and be active.
   * @effects Increments active_requests count.
   */
  async makeRequest(
    { session }: { session: Session },
  ): Promise<{ ok: boolean } | { error: string }> {
    const result = await this.sessions.updateOne(
      { _id: session, active: true },
      { $inc: { active_requests: 1 } },
    );

    if (result.matchedCount === 0) {
      return { error: "Session not found or inactive." };
    }

    return { ok: true };
  }
}

