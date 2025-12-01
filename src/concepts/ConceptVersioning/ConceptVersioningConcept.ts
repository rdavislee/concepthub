import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import {
  deleteFiles,
  downloadFiles,
  getPublicUrl,
  uploadFiles,
} from "@utils/storage.ts";

// Generic external parameter types (opaque identifiers)
export type Concept = ID;
export type Item = ID;

const PREFIX = "ConceptVersioning" + ".";
const CONCEPT_REGISTERING_PREFIX = "ConceptRegistering" + ".";

/**
 * State: a set of Version with
 *   a concept Concepts
 *   a version Number
 *   a fileURL String
 *   a created_at DateTime
 */
interface VersionDoc {
  _id: Item;
  concept: Concept;
  version: number;
  fileURL: string;
  created_at: Date;
}

/**
 * Concept document from ConceptRegistering (to get author/userId)
 */
interface ConceptDoc {
  _id: Concept;
  author: ID; // User ID
}

/**
 * @concept ConceptVersioning
 * @purpose Track multiple versions of concepts, each with a version number, file URL, and creation timestamp, enabling version history and retrieval.
 * @principle When a concept version is uploaded with a version number and file content, it uploads the file to storage, creates a new version record with the storage URL, and stores the URL in state; later versions can be uploaded for the same concept, and any version can be downloaded (retrieving the file from storage) or retrieved by its concept and version number (or the latest if no version is specified).
 */
export default class ConceptVersioningConcept {
  versions: Collection<VersionDoc>;
  concepts: Collection<ConceptDoc>; // ConceptRegistering collection to get author

  constructor(private readonly db: Db) {
    this.versions = this.db.collection<VersionDoc>(PREFIX + "versions");
    this.concepts = this.db.collection<ConceptDoc>(
      CONCEPT_REGISTERING_PREFIX + "concepts",
    );
  }

  /**
   * upload (concept: Concepts, version: Number, fileContent?: File, files?: Map<String, File>) : (id: Item)
   *
   * **requires** concept exists; no version with same concept and version number
   * **requires** either fileContent (single file) or files (multiple files) must be provided
   *
   * **effects** upload file(s) to storage as a folder, get fileURL from storage, create version with id := fresh, concept := concept, version := version, fileURL := base URL for folder, created_at := now
   */
  async upload(
    {
      concept,
      version,
      fileContent,
      files,
    }: {
      concept: Concept;
      version: number;
      fileContent?: Uint8Array;
      files?: Map<string, Uint8Array>;
    },
  ): Promise<{ id: Item } | { error: string }> {
    if (!concept) {
      return { error: "concept is required" };
    }
    if (version === undefined || version === null || version < 0) {
      return { error: "version must be a non-negative number" };
    }

    // Convert fileContent to files Map if provided, otherwise use files
    let filesToUpload: Map<string, Uint8Array>;
    if (files && files.size > 0) {
      filesToUpload = files;
    } else if (fileContent && fileContent.length > 0) {
      // Convert single file to a folder with one file (default name: "index")
      filesToUpload = new Map([["index", fileContent]]);
    } else {
      return {
        error:
          "Either fileContent (single file) or files (multiple files) must be provided",
      };
    }

    // Check if concept exists and get its author (userId)
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return { error: "Concept does not exist" };
    }
    const userId = conceptDoc.author;

    // Check if version already exists for this concept and version number
    const existing = await this.versions.findOne({ concept, version });
    if (existing) {
      return {
        error: "A version with this concept and version number already exists",
      };
    }

    try {
      // Always store as folder structure
      const basePath = `concepts/${userId}/${concept}/v${version}`;

      // Upload all files as a folder
      await uploadFiles(basePath, filesToUpload, {
        contentType: "application/octet-stream",
        upsert: false,
      });

      // Use the base path URL as the version's fileURL
      const fileURL = getPublicUrl(basePath);

      // Create version record
      const id = freshID() as Item;
      const now = new Date();
      await this.versions.insertOne({
        _id: id,
        concept,
        version,
        fileURL,
        created_at: now,
      });

      return { id };
    } catch (error) {
      return {
        error: `Failed to upload file(s) to storage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * download (id: Item) : (files: Map<String, File>, version: Number, created_at: DateTime)
   *
   * **requires** version exists for id
   *
   * **effects** get fileURL from version, download files from storage as a folder
   * Returns files Map containing all files in the version folder
   */
  async download(
    { id }: { id: Item },
  ): Promise<
    | {
      files: Map<string, Uint8Array>;
      version: number;
      created_at: Date;
    }
    | { error: string }
  > {
    if (!id) {
      return { error: "id is required" };
    }

    const version = await this.versions.findOne({ _id: id });
    if (!version) {
      return { error: "Version does not exist" };
    }

    try {
      // Get the concept to find the userId (author)
      const conceptDoc = await this.concepts.findOne({ _id: version.concept });
      if (!conceptDoc) {
        return { error: "Concept does not exist" };
      }
      const userId = conceptDoc.author;

      // Reconstruct base path: concepts/{userId}/{conceptId}/v{version}
      const basePath =
        `concepts/${userId}/${version.concept}/v${version.version}`;

      // Download as folder (all versions are stored as folders)
      try {
        const files = await downloadFiles(basePath);
        if (files.size === 0) {
          return {
            error: "Failed to download files: folder is empty",
          };
        }
        return {
          files,
          version: version.version,
          created_at: version.created_at,
        };
      } catch (error) {
        return {
          error: `Failed to download files from storage: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    } catch (error) {
      return {
        error: `Failed to download file(s) from storage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * remove (id: Item) : (ok: Flag)
   *
   * **requires** version exists for id
   *
   * **effects** get fileURL from version, delete file from storage using fileURL, delete that version
   */
  async remove(
    { id }: { id: Item },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!id) {
      return { error: "id is required" };
    }

    const version = await this.versions.findOne({ _id: id });
    if (!version) {
      return { error: "Version does not exist" };
    }

    try {
      // Get the concept to find the userId (author)
      const conceptDoc = await this.concepts.findOne({ _id: version.concept });
      if (!conceptDoc) {
        return { error: "Concept does not exist" };
      }
      const userId = conceptDoc.author;

      // Reconstruct base path: concepts/{userId}/{conceptId}/v{version}
      const basePath =
        `concepts/${userId}/${version.concept}/v${version.version}`;

      // Delete as folder (all versions are stored as folders)
      try {
        await deleteFiles(basePath);
      } catch {
        // If folder delete fails, still continue to delete the version record
        // The storage cleanup can be handled separately if needed
      }

      // Delete version record
      const result = await this.versions.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return { error: "Failed to delete version record" };
      }

      return { ok: true };
    } catch (error) {
      return {
        error: `Failed to remove version: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * _get (concept: Concepts, version?: Number) : (id: Item, fileURL: String, version: Number, created_at: DateTime)
   *
   * If version is provided:
   *   **requires** version exists for concept and version number
   *   **effects** returns version with specified concept and version number
   *
   * If version is not provided:
   *   **requires** at least one version exists for concept
   *   **effects** returns the latest version for the concept (highest version number, or most recent created_at if versions are equal)
   */
  async _get(
    { concept, version }: { concept: Concept; version?: number },
  ): Promise<
    Array<{
      id: Item;
      fileURL: string;
      version: number;
      created_at: Date;
    }>
  > {
    if (version !== undefined) {
      // Get specific version
      const versionDoc = await this.versions.findOne({ concept, version });
      if (!versionDoc) {
        return [];
      }
      return [
        {
          id: versionDoc._id,
          fileURL: versionDoc.fileURL,
          version: versionDoc.version,
          created_at: versionDoc.created_at,
        },
      ];
    } else {
      // Get latest version (highest version number, or most recent created_at if versions are equal)
      const versions = await this.versions
        .find({ concept })
        .sort({ version: -1, created_at: -1 })
        .limit(1)
        .toArray();

      if (versions.length === 0) {
        return [];
      }

      const versionDoc = versions[0];
      return [
        {
          id: versionDoc._id,
          fileURL: versionDoc.fileURL,
          version: versionDoc.version,
          created_at: versionDoc.created_at,
        },
      ];
    }
  }

  /**
   * _getAuthorOfVersion (version: Item) : (author: Users)
   *
   * **requires** version exists
   *
   * **effects** returns the author of the concept that the version belongs to
   */
  async _getAuthorOfVersion(
    { version }: { version: Item },
  ): Promise<Array<{ author: ID }>> {
    const versionDoc = await this.versions.findOne({ _id: version });
    if (!versionDoc) {
      return [];
    }
    const conceptDoc = await this.concepts.findOne({ _id: versionDoc.concept });
    if (!conceptDoc) {
      return [];
    }
    return [{ author: conceptDoc.author }];
  }

  /**
   * _downloadLatest (concept: Concepts) : (files: Map<String, File>, version: Number, created_at: DateTime)
   *
   * **requires** at least one version exists for concept
   * **effects** retrieves latest version metadata then downloads all files in that version folder and returns them
   */
  async _downloadLatest(
    { concept }: { concept: Concept },
  ): Promise<
    Array<{
      files: Map<string, Uint8Array>;
      version: number;
      created_at: Date;
    }>
  > {
    // Get latest version record
    const versions = await this.versions
      .find({ concept })
      .sort({ version: -1, created_at: -1 })
      .limit(1)
      .toArray();

    if (versions.length === 0) {
      return [];
    }
    const versionDoc = versions[0];

    // Need userId to reconstruct path; get concept doc
    const conceptDoc = await this.concepts.findOne({ _id: concept });
    if (!conceptDoc) {
      return [];
    }
    const userId = conceptDoc.author;
    const basePath = `concepts/${userId}/${concept}/v${versionDoc.version}`;

    try {
      const files = await downloadFiles(basePath);
      return [{
        files,
        version: versionDoc.version,
        created_at: versionDoc.created_at,
      }];
    } catch {
      return [];
    }
  }
}
