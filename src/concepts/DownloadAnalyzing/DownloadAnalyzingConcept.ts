import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic external parameter types (opaque identifiers)
export type Item = ID;
export type User = ID;
export type Download = ID; // internal identity for a download record

const PREFIX = "DownloadAnalyzing" + ".";

/**
 * State: a set of Downloads with an item Item, a user Users, an at DateTime
 */
interface DownloadDoc {
  _id: Download;
  item: Item;
  user: User;
  at: Date; // timestamp of download
}

/**
 * @concept DownloadAnalyzing
 * @purpose Record that a user downloaded an item, enabling analytics and rate/abuse insights (analysis via queries/consumers).
 * @principle When a download occurs it is recorded with time and identities; later, aggregates are computed via queries; records are append-only.
 */
export default class DownloadAnalyzingConcept {
  downloads: Collection<DownloadDoc>;

  constructor(private readonly db: Db) {
    this.downloads = this.db.collection<DownloadDoc>(PREFIX + "downloads");
  }

  /**
   * record (item: Item, user: Users, at: DateTime) : (download: Downloads) | (error: String)
   *
   * **requires** true
   * **effects** create download record with given timestamp; returns its identity
   */
  async record(
    { item, user, at }: { item: Item; user: User; at: Date },
  ): Promise<{ download: Download } | { error: string }> {
    // Precondition always true; still safeguard for malformed inputs
    if (!item || !user || !at) {
      return { error: "Missing required fields item, user or at" };
    }
    const downloadId = freshID() as Download;
    await this.downloads.insertOne({ _id: downloadId, item, user, at });
    return { download: downloadId };
  }

  /**
   * _countForItem(item: Item, from: DateTime, to: DateTime) : (count: Number)
   * Returns number of downloads of item between inclusive date range.
   */
  async _countForItem(
    { item, from, to }: { item: Item; from: Date; to: Date },
  ): Promise<Array<{ count: number }>> {
    const count = await this.downloads.countDocuments({
      item,
      at: { $gte: from, $lte: to },
    });
    return [{ count }];
  }

  /**
   * _recentForUser(user: Users) : (download: Downloads)
   * Returns recent downloads for a user ordered by time descending.
   */
  async _recentForUser(
    { user, limit = 25 }: { user: User; limit?: number },
  ): Promise<Array<{ download: Download }>> {
    const docs = await this.downloads.find({ user }).sort({ at: -1 }).limit(limit).project({ _id: 1 }).toArray();
    return docs.map((d) => ({ download: d._id as Download }));
  }
}
