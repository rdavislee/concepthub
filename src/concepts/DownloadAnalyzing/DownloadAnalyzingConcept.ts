import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

// Generic external parameter types
// DownloadAnalyzing [Item, User]
export type Item = ID;
export type User = ID;

const PREFIX = "DownloadAnalyzing" + ".";

interface ItemState {
  _id: Item;
  downloads: Array<{
    user: User;
    at: Date;
  }>;
}

/**
 * @concept DownloadAnalyzing
 * @purpose Record that a user downloaded an item, enabling analytics and rate/abuse insights (analysis via queries/consumers).
 * @principle When a download occurs it is recorded with time and identities; later, aggregates are computed via queries; records are append-only.
 * @state
 *  a set of items with
 *    a set of Downloads with
 *      a userID
 *      a DateTime
 */
export default class DownloadAnalyzingConcept {
  items: Collection<ItemState>;

  constructor(private readonly db: Db) {
    this.items = this.db.collection<ItemState>(PREFIX + "items");
  }

  /**
   * Action: record (item: Item, user: userID, at: DateTime) : (ok: Flag)
   * requires: true
   * effects: create download record
   */
  async record(
    { item, user, at }: { item: Item; user: User; at: Date },
  ): Promise<{ ok: boolean } | { error: string }> {
    await this.items.updateOne(
      { _id: item },
      { $push: { downloads: { user, at } } },
      { upsert: true },
    );
    return { ok: true };
  }

  /**
   * Query: _countForItem(item: Item) : (count: Number)
   */
  async _countForItem(
    { item }: { item: Item },
  ): Promise<Array<{ count: number }>> {
    const doc = await this.items.findOne(
      { _id: item },
      { projection: { downloads: 1 } },
    );

    if (!doc || !doc.downloads) {
      return [{ count: 0 }];
    }

    return [{ count: doc.downloads.length }];
  }
}
