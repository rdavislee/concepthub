import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// External parameter types
export type Item = ID;
export type User = ID;

// Internal identity for a registered concept record
export type Concept = ID;

const PREFIX = "Registering" + ".";

interface ConceptDoc {
  _id: Concept; // id
  uniqueName: string; // unique_name
  url: string; // file URL or path
  author: User;
}

/**
 * @concept Registering
 * @purpose Capture registered concept files with unique names so they can be downloaded or removed later, preserving authorship.
 * @principle Every registered concept has a unique name mapped to a source file URL and an author; uploads add new records, downloads read them, and removes delete them.
 * @state a set of Concept with an id Item, a unique_name String, a url File, an author Users
 */
export default class RegisteringConcept {
  concepts: Collection<ConceptDoc>;

  constructor(private readonly db: Db) {
    this.concepts = this.db.collection<ConceptDoc>(PREFIX + "concepts");
  }

  /**
   * Action: upload (unique_name: String, url: File, author: Users) : (id: Item)
   * requires: unique_name is not already used
   * effects: create concept with id := fresh, url := url, author := author
   */
  async upload(
    { uniqueName, url, author }: {
      uniqueName: string;
      url: string;
      author: User;
    },
  ): Promise<{ id: Concept } | { error: string }> {
    if (!uniqueName?.trim() || !url?.trim() || !author) {
      return { error: "uniqueName, url, and author are required" };
    }
    const existing = await this.concepts.findOne({ uniqueName });
    if (existing) {
      return { error: "unique_name already registered" };
    }
    const id = freshID() as Concept;
    await this.concepts.insertOne({
      _id: id,
      uniqueName,
      url,
      author,
    });
    return { id };
  }

  /**
   * Action: download (id: Item) : (url: File, unique_name: String, author: Users)
   * requires: concept exists for id
   * effects: none (read-only)
   */
  async download(
    { id }: { id: Concept },
  ): Promise<
    { url: string; uniqueName: string; author: User } | { error: string }
  > {
    if (!id) {
      return { error: "id is required" };
    }
    const concept = await this.concepts.findOne({ _id: id });
    if (!concept) {
      return { error: "Concept not found" };
    }
    return {
      url: concept.url,
      uniqueName: concept.uniqueName,
      author: concept.author,
    };
  }

  /**
   * Action: remove (id: Item) : (ok: Flag)
   * requires: concept exists for id
   * effects: delete that concept
   */
  async remove(
    { id }: { id: Concept },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!id) {
      return { error: "id is required" };
    }
    const result = await this.concepts.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return { error: "Concept not found" };
    }
    return { ok: true };
  }
}
