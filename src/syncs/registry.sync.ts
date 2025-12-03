import { actions, Frames, Sync } from "@engine";
import {
  ConceptRegistering,
  ConceptVersioning,
  Requesting,
  UserProfileDisplaying,
  UserSessioning,
} from "@concepts";

//-- Publish Request (New Concept) --//
// Matches if concept does NOT exist
export const PublishRequestNew: Sync = ({
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
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    
    frames = frames.filter(($) => $[user] !== undefined);
    if (frames.length === 0) return [];

    const checkFrames = await frames.query(ConceptRegistering._getAll, {}, {
      unique_name,
      concept,
    });
    
    const existing = checkFrames.find(($) => $[unique_name] === frames[0][unique_name]);
    if (existing) {
        return []; // Filter OUT if exists
    }
    
    return frames;
  },
  then: actions([ConceptRegistering.add, { unique_name, author: user }]),
});

//-- Publish Version Upload (New Concept) --//
// Matches when a concept is newly created (via add)
export const PublishVersionUploadNew: Sync = ({
  request,
  concept,
  files,
  filesMap,
  author,
  now,
  created_at,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/registry/publish",
      files,
    }, { request }],
    [ConceptRegistering.add, {}, { id: concept }],
  ),
  where: async (frames) => {
    frames = await frames.query(ConceptRegistering._getAuthor, { concept }, {
      author,
    });

    const result = frames.map(($) => {
      const frame = { ...$, [now]: new Date() }; // Generate fresh date
      const filesValue = $[files] as unknown;

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
        createdAt: now, // Use generated date
      },
    ],
  ),
});

//-- Publish Version Upload (Existing Concept) --//
// Matches when a concept already exists (via Request only, guarded by queries)
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
  now,
  created_at,
  versions,
  version_created_at,
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

    // 2. Check if concept exists and get ID using _lookup query
    const originalFrame = frames[0];
    const lookupFrames = await frames.query(ConceptRegistering._lookup, { unique_name }, { concept });
    
    if (lookupFrames.length === 0) {
      return []; // Concept does not exist (handled by New flow)
    }
    
    const conceptId = lookupFrames[0][concept];
    // Merge concept ID into frame
    const frameWithConcept = { ...originalFrame, [concept]: conceptId };
    
    // 3. Check Authorship
    const authorFrames = await new Frames(frameWithConcept).query(ConceptRegistering._getAuthor, { concept }, { author });
    if (authorFrames.length === 0 || authorFrames[0][author] !== originalFrame[user]) {
        return []; // Not author or concept somehow missing
    }
    
    // 4. Determine Next Version and PREVENT DOUBLE FIRE
    // Get latest version
    const versionFrames = await new Frames(frameWithConcept).query(
        ConceptVersioning._get, 
        { concept: conceptId }, 
        { version: latest_version, created_at: version_created_at }
    );
    
    let nextVersionNum = 1;
    if (versionFrames.length > 0) {
        // Check for Double Fire (Race Condition with New Flow)
        // If the latest version was created very recently (< 2000ms), assume it was created by the current request flow
        // and we should NOT create another one.
        const lastCreated = versionFrames[0][version_created_at] as Date;
        const timeDiff = new Date().getTime() - lastCreated.getTime();
        
        if (timeDiff < 2000) {
            return []; // Too recent! Assume duplicate.
        }

        nextVersionNum = (versionFrames[0][latest_version] as number) + 1;
    } else {
        // No versions found in ConceptVersioning.
        // This means it's a New Concept where the New Sync hasn't finished uploading V1 yet.
        // Safer to assume New flow handles this.
        return [];
    }
    
    // Add next_version and fresh date to frame
    const frameWithVersion = { 
        ...frameWithConcept, 
        [next_version]: nextVersionNum,
        [now]: new Date() 
    };
    
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
        createdAt: now, // Use generated date
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
    // Note: We rely on ConceptRegistering.addVersion to provide 'concept'
    [ConceptVersioning.upload, {}, { id: version }],
    [ConceptRegistering.addVersion, { concept }, {}],
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
