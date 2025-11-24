import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as bcrypt from "npm:bcryptjs";

const PREFIX = "UserAuthenticating.";

export type User = ID;

interface UserDoc {
  _id: User;
  email: string;
  password: string;
  access_token?: string;
  refresh_token?: string;
}

/**
 * @concept UserAuthenticating
 * @purpose Authenticate users by issuing and revoking credentials and tokens.
 */
export default class UserAuthenticatingConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Action: Register a new user.
   * @requires email must be unique
   * @effects Creates a new user with hashed password.
   */
  async register(
    { email, password }: { email: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    const existingUser = await this.users.findOne({ email });
    if (existingUser) {
      return { error: "User with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = freshID() as User;

    await this.users.insertOne({
      _id: userId,
      email,
      password: hashedPassword,
    });

    return { user: userId };
  }

  /**
   * Action: Authenticate a user.
   * @requires User must exist and password must match.
   * @effects Updates user with new access and refresh tokens.
   */
  async authenticate(
    { email, password }: { email: string; password: string },
  ): Promise<{ user: UserDoc } | { error: string }> {
    const user = await this.users.findOne({ email });
    if (!user) {
      return { error: "Invalid email or password." };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return { error: "Invalid email or password." };
    }

    const access_token = crypto.randomUUID();
    const refresh_token = crypto.randomUUID();

    await this.users.updateOne(
      { _id: user._id },
      { $set: { access_token, refresh_token } },
    );

    return {
      user: {
        ...user,
        access_token,
        refresh_token,
      },
    };
  }
}

