import { actions, Frames, Sync } from "@engine";
import {
  ConceptRegistering,
  ConceptVersioning,
  Requesting,
  UserProfileDisplaying,
  UserSessioning,
} from "@concepts";

//-- Publish Request --//
// When a publish request comes in, check if concept exists.
// If NOT: Create concept (ConceptRegistering.add)
// If YES: Do nothing (proceed to existing upload flow)
export const PublishRequest: Sync = ({
  request,
  unique_name,
  accessToken,
  user,
  concept,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/registry/publish", unique_name, accessToken },
    { request },
  ]),
  where: async (frames) => {
    // Map accessToken to user
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    
    // Filter out if user not found
    frames = frames.filter(($) => $[user] !== undefined);
    if (frames.length === 0) return [];

    // Check if concept exists
    const checkFrames = await frames.query(ConceptRegistering._getAll, {}, {
      unique_name,
      concept,
    });
    
    // If any concept with this unique_name exists, filter this frame OUT (prevent add)
    // We are looking for the case where the concept matches the request's unique_name
    const existing = checkFrames.find(($) => $[unique_name] === frames[0][unique_name]);
    
    if (existing) {
        // Concept exists! Return empty to prevent 'then' (add) from firing
        return [];
    }
    
    // Concept does not exist, proceed to add
    return frames;
  },
  then: actions([ConceptRegistering.add, { unique_name, author: user }]),
});

//-- Publish Version Upload (New Concept) --//
// Matches when a concept is newly created
export const PublishVersionUploadNew: Sync = ({
  request,
  concept,
  files,
  filesMap,
  author,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/registry/publish",
      files,
    }, { request }],
    [ConceptRegistering.add, {}, { id: concept }],
  ),
  where: async (frames) => {
    // Check authorship (guaranteed by flow, but good to have)
    frames = await frames.query(ConceptRegistering._getAuthor, { concept }, {
      author,
    });

    const result = frames.map(($) => {
      const frame = { ...$ };
      const filesValue = $[files] as unknown;

      // Convert files object to Map
      if (filesValue) {
        if (filesValue instanceof Map) {
          frame[filesMap] = filesValue;
        } else if (
          typeof filesValue === "object" && filesValue !== null &&
          !Array.isArray(filesValue)
        ) {
          const filesObj = filesValue as Record<string, number[] | Uint8Array>;
          const convertedMap = new Map<string, Uint8Array>();

          for (const [path, content] of Object.entries(filesObj)) {
            if (Array.isArray(content)) {
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
  then: actions(
    [
      ConceptVersioning.upload,
      {
        concept,
        version: 1,
        files: filesMap,
      },
    ],
    [
      ConceptRegistering.addVersion,
      {
        concept,
        version: 1,
        createdAt: new Date(),
      },
    ],
  ),
});

//-- Publish Version Upload (Existing Concept) --//
// Matches when a concept already exists
export const PublishVersionUploadExisting: Sync = ({
  request,
  unique_name,
  accessToken,
  concept,
  files,
  filesMap,
  user,
  author,
  latest_version,
  next_version,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/registry/publish", unique_name, accessToken, files },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate User
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    frames = frames.filter(($) => $[user] !== undefined);
    if (frames.length === 0) return [];

    // 2. Check if concept exists and get ID
    const originalFrame = frames[0];
    let conceptFrames = await frames.query(ConceptRegistering._getAll, {}, {
      concept,
      unique_name,
      author,
    });
    
    // Match by unique_name
    conceptFrames = conceptFrames.filter(($) => $[unique_name] === originalFrame[unique_name]);
    
    // If DOES NOT exist, return empty (handled by PublishRequest -> New flow)
    if (conceptFrames.length === 0) return [];
    
    // 3. Check Authorship
    const conceptFrame = conceptFrames[0];
    if (conceptFrame[author] !== originalFrame[user]) {
        // User is not the author!
        // TODO: Should probably respond with error, but for now just don't process
        return [];
    }
    
    // 4. Determine Next Version
    const conceptId = conceptFrame[concept];
    // Get latest version
    const versionFrames = await new Frames(conceptFrame).query(
        ConceptVersioning._get, 
        { concept: conceptId }, 
        { version: latest_version }
    );
    
    let nextVersionNum = 1;
    if (versionFrames.length > 0) {
        nextVersionNum = (versionFrames[0][latest_version] as number) + 1;
    }
    
    // Add next_version to frame
    const frameWithVersion = { ...conceptFrame, [next_version]: nextVersionNum };
    
    // 5. Process Files (Reuse logic)
    const filesValue = originalFrame[files] as unknown;
    if (filesValue) {
        if (filesValue instanceof Map) {
          frameWithVersion[filesMap] = filesValue;
        } else if (
          typeof filesValue === "object" && filesValue !== null &&
          !Array.isArray(filesValue)
        ) {
          const filesObj = filesValue as Record<string, number[] | Uint8Array>;
          const convertedMap = new Map<string, Uint8Array>();

          for (const [path, content] of Object.entries(filesObj)) {
            if (Array.isArray(content)) {
              convertedMap.set(path, new Uint8Array(content));
            } else if (content instanceof Uint8Array) {
              convertedMap.set(path, content);
            }
          }

          if (convertedMap.size > 0) {
            frameWithVersion[filesMap] = convertedMap;
          }
        }
    }
    
    return new Frames(frameWithVersion);
  },
  then: actions(
    [
      ConceptVersioning.upload,
      {
        concept,
        version: next_version,
        files: filesMap,
      },
    ],
    [
      ConceptRegistering.addVersion,
      {
        concept,
        version: next_version,
        createdAt: new Date(),
      },
    ],
  ),
});

//-- Publish Response Success --//
// Respond with success when version upload and registration completes
export const PublishResponseSuccess: Sync = ({
  request,
  concept,
  version,
  unique_name,
}) => ({
  when: actions(
    [Requesting.request, { path: "/registry/publish", unique_name }, { request }],
    // Matches ANY successful upload for this request's unique_name context
    // Note: We need to bridge unique_name back to concept to ensure we match the right response
    // But Requesting.request keeps the context.
    [ConceptVersioning.upload, { concept }, { id: version }],
    [ConceptRegistering.addVersion, { concept }, {}],
  ),
  where: async (frames) => {
     // Ensure unique_name matches the concept uploaded
     // (Optional but good for consistency if unique_name is used in response)
     // The request has unique_name.
     return frames;
  },
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
    [ConceptRegistering.add, {}, { error }],
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
    // Matches either add or just request existence? 
    // If upload fails, we want to respond.
    [ConceptVersioning.upload, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Publish Response Error: Authentication Failed --//
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
    // Re-check auth to confirm it failed (inverse of PublishRequest where clause)
    const user = Symbol("user");
    const authFrames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    // Only return frames where user was NOT found
    if (authFrames.some(($) => $[user] !== undefined)) {
      return [];
    }
    // Return original frames with error message
    return frames.map(($) => ({ ...$, [error]: "Invalid access token" }));
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
    return collected;
  },
  then: actions([Requesting.respond, { request, results }]),
});

//-- Registry Files Request --//
// Returns the version's files for a concept identified by unique_name
// Response shape: { files: Record<string, string> } where values are base64-encoded contents
export const RegistryFilesRequest: Sync = ({
  request,
  unique_name,
  concept,
  version,
  files,
  files_json,
  version_num,
}) => ({
  when: actions([
    Requesting.request,
    // Can optionally provide a version, otherwise defaults to latest logic below
    { path: "/registry/files", unique_name, version },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requestedVersion = originalFrame[version] as number | undefined;

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

    // Get version to download
    let versionToDownload = requestedVersion;
    if (versionToDownload === undefined) {
        // If no version specified, get the latest one first
        const latestFrames = await new Frames(conceptFrames[0]).query(ConceptVersioning._get, { concept: conceptId }, { version: version_num });
         if (latestFrames.length > 0) {
            versionToDownload = latestFrames[0][version_num] as number;
         } else {
             return new Frames({ ...originalFrame, [files_json]: {} });
         }
    }

    // Download specific version files via _download query
    // IMPORTANT: We are NOT recording a download here (no DownloadAnalyzing.record)
    // because this is for viewing/previewing in the registry UI.
    frames = await new Frames({...originalFrame, [concept]: conceptId, [version]: versionToDownload}).query(ConceptVersioning._download, {
      concept: conceptId,
      version: versionToDownload,
    }, { files });
    
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
