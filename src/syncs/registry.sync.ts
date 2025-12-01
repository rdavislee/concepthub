import { actions, Frames, Sync } from "@engine";
import {
  ConceptRegistering,
  ConceptVersioning,
  Requesting,
  UserProfileDisplaying,
  UserSessioning,
} from "@concepts";

//-- Publish Request --//
// When a publish request comes in, extract user from accessToken and create concept + version
export const PublishRequest: Sync = ({
  request,
  unique_name,
  accessToken,
  user,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/registry/publish", unique_name, accessToken },
    { request },
  ]),
  where: async (frames) => {
    // Map accessToken to user (Session type is the access token string)
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ConceptRegistering.add, { unique_name, author: user }]),
});

//-- Publish Version Upload --//
// After concept is created, upload version 1 with files
// This sync matches on both the request (to get files) and the concept creation (to get concept)
export const PublishVersionUpload: Sync = ({
  request,
  concept,
  files,
  filesMap,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/registry/publish",
      files,
    }, { request }],
    [ConceptRegistering.add, {}, { id: concept }],
  ),
  where: (frames) => {
    // Convert files from JSON object { [key: string]: number[] } to Map<string, Uint8Array>
    const result = frames.map(($) => {
      const frame = { ...$ };
      const filesValue = $[files] as unknown;

      // Convert files object to Map if provided
      if (filesValue) {
        if (filesValue instanceof Map) {
          // Already a Map, just copy it
          frame[filesMap] = filesValue;
        } else if (
          typeof filesValue === "object" && filesValue !== null &&
          !Array.isArray(filesValue)
        ) {
          // Convert object to Map
          const filesObj = filesValue as Record<string, number[] | Uint8Array>;
          const convertedMap = new Map<string, Uint8Array>();

          for (const [path, content] of Object.entries(filesObj)) {
            if (Array.isArray(content)) {
              // Convert number array to Uint8Array
              convertedMap.set(path, new Uint8Array(content));
            } else if (content instanceof Uint8Array) {
              convertedMap.set(path, content);
            }
          }

          if (convertedMap.size > 0) {
            frame[filesMap] = convertedMap;
          }
        }
      }

      return frame;
    });

    return result;
  },
  then: actions([
    ConceptVersioning.upload,
    {
      concept,
      version: 1,
      files: filesMap,
    },
  ]),
});

//-- Publish Response Success --//
// Respond with success when both concept and version are created
export const PublishResponseSuccess: Sync = ({
  request,
  concept,
  version,
  unique_name,
}) => ({
  when: actions(
    [Requesting.request, { path: "/registry/publish" }, { request }],
    [ConceptRegistering.add, { unique_name }, { id: concept }],
    [ConceptVersioning.upload, { concept, version: 1 }, { id: version }],
  ),
  then: actions([
    Requesting.respond,
    { request, concept, version, unique_name, ok: true },
  ]),
});

//-- Publish Response Error: Concept Registration Failed --//
export const PublishResponseErrorConcept: Sync = ({
  request,
  unique_name,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/registry/publish", unique_name }, {
      request,
    }],
    [ConceptRegistering.add, { unique_name }, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Publish Response Error: Version Upload Failed --//
export const PublishResponseErrorVersion: Sync = ({
  request,
  concept,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/registry/publish" }, { request }],
    [ConceptRegistering.add, {}, { id: concept }],
    [ConceptVersioning.upload, { concept, version: 1 }, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Publish Response Error: Authentication Failed --//
// This handles cases where the accessToken is invalid or missing
export const PublishResponseErrorAuth: Sync = ({
  request,
  accessToken,
  error,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/registry/publish", accessToken },
    { request },
  ]),
  where: async (frames) => {
    // Try to get user from accessToken - if it fails, we'll get an error
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { error });
    // Keep only frames where we got an error (authentication failed)
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions([Requesting.respond, { request, error }]),
});

//-- Registry All Request --//
// Returns all registered concepts
// This endpoint is public and does not require authentication (no accessToken needed)
export const RegistryAllRequest: Sync = ({
  request,
  concept,
  unique_name,
  author,
  author_username,
  created_at,
  updated_at,
  results,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/registry/all" },
    { request },
  ]),
  where: async (frames) => {
    // Get the original frame to preserve request binding
    const originalFrame = frames[0];

    // Query all concepts
    frames = await frames.query(ConceptRegistering._getAll, {}, {
      concept,
      unique_name,
      author,
      created_at,
      updated_at,
    });

    // Handle empty case - return empty array
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // Filter out frames missing author before querying profiles
    frames = frames.filter(($) => $[author] !== undefined);

    // If all were filtered out, respond with empty results while preserving request binding
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // Query profiles for all authors to get usernames
    frames = await frames.query(UserProfileDisplaying._profileOf, {
      user: author,
    }, { username: author_username });

    // Collect all concepts into results array, including author_username
    const collected = frames.collectAs(
      [concept, unique_name, author, author_username, created_at, updated_at],
      results,
    );

    // Ensure request binding is preserved on collected frame(s)
    return collected.map(($) => ({ ...$, [request]: originalFrame[request] }));
  },
  then: actions([Requesting.respond, { request, results }]),
});

//-- Registry Files Request --//
// Returns the latest version's files for a concept identified by unique_name
// Response shape: { files: Record<string, string> } where values are base64-encoded contents
export const RegistryFilesRequest: Sync = ({
  request,
  unique_name,
  concept,
  version,
  files,
  files_json,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/registry/files", unique_name },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Get all concepts and match by unique_name to find concept id
    let conceptFrames = await frames.query(ConceptRegistering._getAll, {}, {
      concept,
      unique_name,
    });
    conceptFrames = conceptFrames.filter(($) =>
      $[unique_name] === originalFrame[unique_name]
    );
    if (conceptFrames.length === 0) {
      return new Frames({ ...originalFrame, [files_json]: {} });
    }
    const conceptId = conceptFrames[0][concept];

    // Download latest version files via new _downloadLatest query
    frames = await frames.query(ConceptVersioning._downloadLatest, {
      concept: conceptId,
    }, { files, version });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [files_json]: {} });
    }

    // Decode Uint8Array files to UTF-8 strings
    const f = frames[0][files] as Map<string, Uint8Array> | undefined;
    const textFiles: Record<string, string> = {};
    if (f instanceof Map) {
      for (const [path, content] of f.entries()) {
        try {
          textFiles[path] = new TextDecoder("utf-8").decode(content);
        } catch {
          // Fallback to base64 if decoding fails
          textFiles[path] = btoa(String.fromCharCode(...content));
        }
      }
    }
    return new Frames({ ...originalFrame, [files_json]: textFiles });
  },
  then: actions([Requesting.respond, { request, files: files_json }]),
});
