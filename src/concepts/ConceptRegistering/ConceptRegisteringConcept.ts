import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic external parameter type (opaque identifier)
export type User = ID;

// Internal entity type
export type Concept = ID;
export type Item = ID;

const PREFIX = "ConceptRegistering" + ".";

/**
 * State: a set of Concepts with
 *   a unique_name String
 *   an author Users
 *   a created_at DateTime
 *   an updated_at DateTime
 *   a set of Versions with
 *     a version number
 *     a createdAt DateTime
 */
interface ConceptDoc {
  _id: Concept;
  unique_name: string;
  author: User;
  created_at: Date;
  updated_at: Date;
  versions?: Array<{
    version: number;
    createdAt: Date;
  }>;
}

/**
 * @concept ConceptRegistering
 * @purpose Capture registered concepts with unique names so they can be managed, renamed, or removed later, preserving authorship.
 * @principle Every registered concept has a unique name and an author; adding creates new records, changing the name updates them, and removing deletes them.
 */
export default class ConceptRegisteringConcept {
  concepts: Collection<ConceptDoc>;

  constructor(private readonly db: Db) {
    this.concepts = this.db.collection<ConceptDoc>(PREFIX + "concepts");
  }

  /**
   * add (unique_name: String, author: Users) : (id: Item)
   *
   * **requires** unique_name is not already used
   *
   * **effects** create concept with id := fresh, unique_name := unique_name, author := author, created_at := now, updated_at := now, Versions := empty
   */
  async add(
    { unique_name, author }: { unique_name: string; author: User },
  ): Promise<{ id: Item } | { error: string }> {
    if (!unique_name?.trim()) {
      return { error: "unique_name is required" };
    }
    if (!author) {
      return { error: "author is required" };
    }
    const existing = await this.concepts.findOne({ unique_name });
    if (existing) {
      return { error: "A concept with this unique_name already exists" };
    }
    const now = new Date();
    const id = freshID() as Concept;
    await this.concepts.insertOne({
      _id: id,
      unique_name,
      author,
      created_at: now,
      updated_at: now,
      versions: [],
    });
    return { id };
  }

  /**
   * addVersion (concept: Concept, version: number, createdAt: DateTime)
   *
   * **requires** Concept exists
   *
   * **effect** adds version to versions Set
   */
  async addVersion(
    { concept, version, createdAt }: {
      concept: Concept;
      version: number;
      createdAt: Date;
    },
  ): Promise<{ ok: boolean } | { error: string }> {
    const result = await this.concepts.updateOne(
      { _id: concept },
      {
        $push: {
          versions: {
            version,
            createdAt,
          },
        },
        $set: { updated_at: new Date() },
      },
    );

    if (result.matchedCount === 0) {
      return { error: "Concept does not exist" };
    }

    return { ok: true };
  }

  /**
   * changeName (id: Item, unique_name: String) : (ok: Flag)
   *
   * **requires** concept exists for id; unique_name is not already used
   *
   * **effects** set unique_name := unique_name, updated_at := now
   */
  async changeName(
    { id, unique_name }: { id: Item; unique_name: string },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!id) {
      return { error: "id is required" };
    }
    if (!unique_name?.trim()) {
      return { error: "unique_name is required" };
    }
    const concept = await this.concepts.findOne({ _id: id });
    if (!concept) {
      return { error: "Concept does not exist" };
    }
    // Check if the new name is already used by a different concept
    const existingWithName = await this.concepts.findOne({ unique_name });
    if (existingWithName && existingWithName._id !== id) {
      return { error: "A concept with this unique_name already exists" };
    }
    const now = new Date();
    await this.concepts.updateOne(
      { _id: id },
      { $set: { unique_name, updated_at: now } },
    );
    return { ok: true };
  }

  /**
   * remove (id: Item) : (ok: Flag)
   *
   * **requires** concept exists for id
   *
   * **effects** delete that concept
   */
  async remove(
    { id }: { id: Item },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!id) {
      return { error: "id is required" };
    }
    const result = await this.concepts.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return { error: "Concept does not exist" };
    }
    return { ok: true };
  }

  /**
   * _getAuthor (concept: Concepts) : (author: Users)
   *
   * **requires** concept exists
   *
   * **effects** returns the author of the concept
   */
  async _getAuthor(
    { concept }: { concept: Concept },
  ): Promise<Array<{ author: User }>> {
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return [];
    }
    return [{ author: conceptDoc.author }];
  }

  /**
   * _getUniqueName (concept: Concepts) : (unique_name: String)
   *
   * **requires** concept exists
   *
   * **effects** returns the unique_name of the concept
   */
  async _getUniqueName(
    { concept }: { concept: Concept },
  ): Promise<Array<{ unique_name: string }>> {
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return [];
    }
    return [{ unique_name: conceptDoc.unique_name }];
  }

  /**
   * _getVersions (concept: Item) : (versions: set(version, createdAt))
   *
   * **requires** concept exists
   *
   * **effects** returns the versions of the concept
   */
  async _getVersions(
    { concept }: { concept: Concept },
  ): Promise<Array<{ versions: Array<{ version: number; createdAt: Date }> }>> {
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc || !conceptDoc.versions) {
      return [{ versions: [] }];
    }
    return [{ versions: conceptDoc.versions }];
  }

  /**
   * _lookup (unique_name: String) : (id: Item)
   *
   * **requires** concept exists
   *
   * **effects** returns the id of the concept
   */
  async _lookup(
    { unique_name }: { unique_name: string },
  ): Promise<Array<{ id: Item }>> {
    const doc = await this.concepts.findOne({ unique_name });
    if (!doc) {
      return [];
    }
    return [{ id: doc._id }];
  }

  /**
   * _getAll () : (concept: Concepts, unique_name: String, author: Users, created_at: DateTime, updated_at: DateTime)
   *
   * **requires** true
   *
   * **effects** returns all registered concepts with their details
   */
  async _getAll(): Promise<Array<{
    concept: Concept;
    unique_name: string;
    author: User;
    created_at: Date;
    updated_at: Date;
  }>> {
    const conceptDocs = await this.concepts.find({}).toArray();
    return conceptDocs.map((doc) => ({
      concept: doc._id,
      unique_name: doc.unique_name,
      author: doc.author,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));
  }
}
