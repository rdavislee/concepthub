import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic external parameter types
// Item and User are external; treat them purely as opaque IDs.
export type Item = ID;
export type User = ID;

// Internal entity type representing a Like relation
export type Like = ID;

const PREFIX = "Liking" + ".";

interface LikeDoc {
  _id: Like; // identity of the like relation
  item: Item;
  user: User;
  at: Date; // timestamp when the like occurred
}

/**
 * @concept Liking
 * @purpose Let users express a binary preference for items, preventing duplicates and enabling reversals.
 * @principle A user can like an item once; unlike removes the relation.
 * @state a set of Likes with an item Item, a user Users, an at DateTime
 */
export default class LikingConcept {
  likes: Collection<LikeDoc>;

  constructor(private readonly db: Db) {
    this.likes = this.db.collection<LikeDoc>(PREFIX + "likes");
  }

  /**
   * Action: like (item: Item, user: Users) : (ok: Flag) | (error: String)
   * requires: no like exists for (item,user)
   * effects: create like with at := now
   */
  async like(
    { item, user }: { item: Item; user: User },
  ): Promise<{ ok: boolean } | { error: string }> {
    const existing = await this.likes.findOne({ item, user });
    if (existing) {
      return { error: "Like already exists for this (item,user) pair" };
    }
    const likeId = freshID() as Like;
    await this.likes.insertOne({ _id: likeId, item, user, at: new Date() });
    return { ok: true };
  }

  /**
   * Action: unlike (item: Item, user: Users) : (ok: Flag) | (error: String)
   * requires: like exists for (item,user)
   * effects: delete that like
   */
  async unlike(
    { item, user }: { item: Item; user: User },
  ): Promise<{ ok: boolean } | { error: string }> {
    const result = await this.likes.deleteOne({ item, user });
    if (result.deletedCount === 0) {
      return { error: "No existing like to remove for this (item,user) pair" };
    }
    return { ok: true };
  }

  /**
   * Query: _isLiked(item: Item, user: Users) : (liked: Flag)
   * returns whether a like exists for (item,user)
   */
  async _isLiked(
    { item, user }: { item: Item; user: User },
  ): Promise<Array<{ liked: boolean }>> {
    const existing = await this.likes.findOne({ item, user }, { projection: { _id: 1 } });
    // Query returns an array of one record for consistency with concept query format.
    return [{ liked: !!existing }];
  }

  /**
   * Query: _count(item: Item) : (n: Number)
   * returns the number of likes for the given item
   */
  async _count(
    { item }: { item: Item },
  ): Promise<Array<{ n: number }>> {
    const n = await this.likes.countDocuments({ item });
    return [{ n }];
  }
}
