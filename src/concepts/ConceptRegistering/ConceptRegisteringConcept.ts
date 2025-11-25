import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic external parameter type (opaque identifier)
export type Author = ID;

// Internal entity types
export type Concept = ID;
export type Version = ID;

// Status enum for versions
export type VersionStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED" | "YANKED";

const PREFIX = "ConceptRegistering" + ".";

/**
 * State: a set of Concepts with
 *   a uniqueName String
 *   an owner Author
 */
interface ConceptDoc {
  _id: Concept;
  uniqueName: string;
  owner: Author;
}

/**
 * State: a set of Versions with
 *   a concept Concepts
 *   a semver String
 *   an artifactUrl String
 *   a status of DRAFT or PUBLISHED or DEPRECATED or YANKED
 *   a publishedAt DateTime
 */
interface VersionDoc {
  _id: Version;
  concept: Concept;
  semver: string;
  artifactUrl: string;
  status: VersionStatus;
  publishedAt: Date;
}

/**
 * @concept ConceptRegistering
 * @purpose Register and version concept artifacts under unique names; allow publishing, deprecation, and yanking of versions.
 * @principle An author publishes a concept/version with a unique name and artifact location; later versions can be published; a version may be deprecated or yanked.
 */
export default class ConceptRegisteringConcept {
  concepts: Collection<ConceptDoc>;
  versions: Collection<VersionDoc>;

  constructor(private readonly db: Db) {
    this.concepts = this.db.collection<ConceptDoc>(PREFIX + "concepts");
    this.versions = this.db.collection<VersionDoc>(PREFIX + "versions");
  }

  /**
   * reserveName (uniqueName: String, owner: Author) : (concept: Concepts)
   *
   * **requires** no concept with uniqueName
   *
   * **effects** create concept with owner
   */
  async reserveName(
    { uniqueName, owner }: { uniqueName: string; owner: Author }
  ): Promise<{ concept: Concept } | { error: string }> {
    if (!uniqueName?.trim()) {
      return { error: "uniqueName is required" };
    }
    if (!owner) {
      return { error: "owner is required" };
    }
    const existing = await this.concepts.findOne({ uniqueName });
    if (existing) {
      return { error: "A concept with this uniqueName already exists" };
    }
    const conceptId = freshID() as Concept;
    await this.concepts.insertOne({
      _id: conceptId,
      uniqueName,
      owner,
    });
    return { concept: conceptId };
  }

  /**
   * publishVersion (concept: Concepts, semver: String, artifactUrl: String) : (version: Versions)
   *
   * **requires** concept exists; no identical semver (unless YANKED)
   *
   * **effects** create version; status=PUBLISHED; set publishedAt
   */
  async publishVersion(
    { concept, semver, artifactUrl }: { concept: Concept; semver: string; artifactUrl: string }
  ): Promise<{ version: Version } | { error: string }> {
    if (!concept) {
      return { error: "concept is required" };
    }
    if (!semver?.trim()) {
      return { error: "semver is required" };
    }
    if (!artifactUrl?.trim()) {
      return { error: "artifactUrl is required" };
    }
    // Check concept exists
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return { error: "Concept does not exist" };
    }
    // Check no identical semver unless YANKED
    const existingVersion = await this.versions.findOne({ concept, semver });
    if (existingVersion && existingVersion.status !== "YANKED") {
      return { error: "A version with this semver already exists and is not YANKED" };
    }
    const versionId = freshID() as Version;
    await this.versions.insertOne({
      _id: versionId,
      concept,
      semver,
      artifactUrl,
      status: "PUBLISHED",
      publishedAt: new Date(),
    });
    return { version: versionId };
  }

  /**
   * deprecate (version: Versions) : (ok: Flag)
   *
   * **requires** version exists; status=PUBLISHED
   *
   * **effects** set status := DEPRECATED
   */
  async deprecate(
    { version }: { version: Version }
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!version) {
      return { error: "version is required" };
    }
    const versionDoc = await this.versions.findOne({ _id: version });
    if (!versionDoc) {
      return { error: "Version does not exist" };
    }
    if (versionDoc.status !== "PUBLISHED") {
      return { error: "Version must be PUBLISHED to deprecate" };
    }
    await this.versions.updateOne(
      { _id: version },
      { $set: { status: "DEPRECATED" } }
    );
    return { ok: true };
  }

  /**
   * yank (version: Versions) : (ok: Flag)
   *
   * **requires** version exists; status in {PUBLISHED, DEPRECATED}
   *
   * **effects** set status := YANKED
   */
  async yank(
    { version }: { version: Version }
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!version) {
      return { error: "version is required" };
    }
    const versionDoc = await this.versions.findOne({ _id: version });
    if (!versionDoc) {
      return { error: "Version does not exist" };
    }
    if (versionDoc.status !== "PUBLISHED" && versionDoc.status !== "DEPRECATED") {
      return { error: "Version must be PUBLISHED or DEPRECATED to yank" };
    }
    await this.versions.updateOne(
      { _id: version },
      { $set: { status: "YANKED" } }
    );
    return { ok: true };
  }

  /**
   * _latestPublished(concept: Concepts) : (version: Versions)
   *
   * Returns the most recently published version for the given concept.
   */
  async _latestPublished(
    { concept }: { concept: Concept }
  ): Promise<Array<{ version: Version }>> {
    const versionDoc = await this.versions
      .find({ concept, status: "PUBLISHED" })
      .sort({ publishedAt: -1 })
      .limit(1)
      .toArray();
    if (versionDoc.length === 0) {
      return [];
    }
    return [{ version: versionDoc[0]._id }];
  }

  /**
   * _findByName(substring: String) : (concept: Concepts)
   *
   * Returns concepts whose uniqueName contains the given substring.
   */
  async _findByName(
    { substring }: { substring: string }
  ): Promise<Array<{ concept: Concept }>> {
    const docs = await this.concepts
      .find({ uniqueName: { $regex: substring, $options: "i" } })
      .toArray();
    return docs.map((d) => ({ concept: d._id }));
  }

  /**
   * _getOwner(concept: Concepts) : (owner: Author)
   *
   * Returns the owner of the given concept.
   */
  async _getOwner(
    { concept }: { concept: Concept }
  ): Promise<Array<{ owner: Author }>> {
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return [];
    }
    return [{ owner: conceptDoc.owner }];
  }

  /**
   * _getOwnerOfVersion(version: Versions) : (owner: Author)
   *
   * Returns the owner of the concept that the version belongs to.
   */
  async _getOwnerOfVersion(
    { version }: { version: Version }
  ): Promise<Array<{ owner: Author }>> {
    const versionDoc = await this.versions.findOne({ _id: version });
    if (!versionDoc) {
      return [];
    }
    const conceptDoc = await this.concepts.findOne({ _id: versionDoc.concept });
    if (!conceptDoc) {
      return [];
    }
    return [{ owner: conceptDoc.owner }];
  }

  /**
   * _getUniqueName(concept: Concepts) : (uniqueName: String)
   *
   * Returns the uniqueName of the given concept.
   */
  async _getUniqueName(
    { concept }: { concept: Concept }
  ): Promise<Array<{ uniqueName: string }>> {
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return [];
    }
    return [{ uniqueName: conceptDoc.uniqueName }];
  }

  /**
   * _artifactUrlOfVersion(version: Versions) : (artifactUrl: String)
   *
   * Returns the artifactUrl of the given version.
   */
  async _artifactUrlOfVersion(
    { version }: { version: Version }
  ): Promise<Array<{ artifactUrl: string }>> {
    const versionDoc = await this.versions.findOne({ _id: version });
    if (!versionDoc) {
      return [];
    }
    return [{ artifactUrl: versionDoc.artifactUrl }];
  }
}

