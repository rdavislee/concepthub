import { actions, Frames, Sync } from "@engine";
import {
  ConceptRegistering,
  ConceptVersioning,
  DownloadAnalyzing,
  Requesting,
  UserProfileDisplaying,
  UserSessioning,
} from "@concepts";

/**
 * DownloadSpecificVersion
 *
 * When a user requests to download a specific version of a concept,
 * retrieve the files for that version. If authenticated, also record the download.
 * Authentication is optional - downloads work without authentication but won't be tracked.
 */
export const DownloadSpecificVersion: Sync = (
  {
    request,
    unique_name,
    author_username,
    concept,
    version,
    user,
    author,
    files,
    files_json,
    created_at,
    download,
    accessToken,
    version_num,
    download_at,
    username,
  },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/concepts/download/version",
        unique_name,
        author_username,
        version,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requestedVersion = originalFrame[version] as number | undefined;

    // Try to authenticate user if accessToken is provided (optional)
    let authenticatedUser: string | undefined;
    const accessTokenValue = originalFrame[accessToken];
    if (accessTokenValue) {
      const authFrames = await frames.query(
        UserSessioning._getUser,
        { session: accessTokenValue },
        { user },
      );
      const validAuthFrames = authFrames.filter(($) => $[user] !== undefined);
      if (validAuthFrames.length > 0) {
        authenticatedUser = validAuthFrames[0][user] as string;
      }
    }

    // Get concept ID using _lookup query
    const lookupFrames = await frames.query(ConceptRegistering._lookup, {
      unique_name: originalFrame[unique_name],
    }, { id: concept });

    if (lookupFrames.length === 0) {
      // Concept not found - return frame with error so we can respond
      // Don't include concept since it doesn't exist
      return new Frames({
        ...originalFrame,
        [files_json]: {},
        [version]: requestedVersion || 0,
        [user]: authenticatedUser,
        [download_at]: new Date(),
      });
    }
    const conceptId = lookupFrames[0][concept];

    // Get the author (user ID) of the concept
    const authorFrames = await new Frames(lookupFrames[0]).query(
      ConceptRegistering._getAuthor,
      { concept: conceptId },
      { author },
    );

    if (authorFrames.length === 0) {
      // Author not found - return frame with error
      return new Frames({
        ...originalFrame,
        [concept]: conceptId,
        [files_json]: {},
        [version]: requestedVersion || 0,
        [user]: authenticatedUser,
        [download_at]: new Date(),
      });
    }
    const authorUserId = authorFrames[0][author] as string;

    // Get the username of the author
    const profileFrames = await new Frames(authorFrames[0]).query(
      UserProfileDisplaying._profileOf,
      { user: authorUserId },
      { username },
    );

    if (profileFrames.length === 0) {
      // Profile not found - return frame with error
      return new Frames({
        ...originalFrame,
        [concept]: conceptId,
        [files_json]: {},
        [version]: requestedVersion || 0,
        [user]: authenticatedUser,
        [download_at]: new Date(),
      });
    }
    const authorUsername = profileFrames[0][username] as string;

    // Verify that the author's username matches the requested author_username
    const requestedAuthorUsername = originalFrame[author_username] as
      | string
      | undefined;
    if (
      !requestedAuthorUsername || authorUsername !== requestedAuthorUsername
    ) {
      // Author username mismatch - return frame with error
      return new Frames({
        ...originalFrame,
        [concept]: conceptId,
        [files_json]: {},
        [version]: requestedVersion || 0,
        [user]: authenticatedUser,
        [download_at]: new Date(),
      });
    }

    // Get version to download
    let versionToDownload = requestedVersion;
    if (versionToDownload === undefined) {
      // If no version specified, get the latest one first
      const latestFrames = await new Frames(lookupFrames[0]).query(
        ConceptVersioning._get,
        { concept: conceptId },
        { version: version_num },
      );
      if (latestFrames.length > 0) {
        versionToDownload = latestFrames[0][version_num] as number;
      } else {
        // No versions found - return frame with error so we can respond
        return new Frames({
          ...originalFrame,
          [concept]: conceptId,
          [files_json]: {},
          [version]: 0,
          [user]: authenticatedUser,
          [download_at]: new Date(),
        });
      }
    }

    // Get the files for the specific version
    const downloadFrame = authenticatedUser
      ? { ...originalFrame, [concept]: conceptId, [user]: authenticatedUser }
      : { ...originalFrame, [concept]: conceptId };

    frames = await new Frames(downloadFrame).query(
      ConceptVersioning._download,
      { concept: conceptId, version: versionToDownload },
      { files, created_at },
    );

    if (frames.length === 0) {
      // Version not found - return frame with error so we can respond
      return new Frames({
        ...originalFrame,
        [concept]: conceptId,
        [files_json]: {},
        [version]: versionToDownload,
        [user]: authenticatedUser,
        [download_at]: new Date(),
      });
    }

    // Decode Uint8Array files to UTF-8 strings for response
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

    // Return frame with json files AND correct variables for next steps
    // We need 'files' (the Map) for potential other uses, but 'files_json' for response
    // We also need 'created_at' for response, and user (always include, even if undefined)
    // Also set download_at to current time for recording
    return new Frames({
      ...frames[0],
      [files_json]: textFiles,
      [version]: versionToDownload, // Ensure correct version is bound
      [user]: authenticatedUser, // Always include user (undefined if not authenticated)
      [download_at]: new Date(), // Set download timestamp here, not in action pattern
    });
  },
  then: actions(
    // Record download (only if concept exists and user is authenticated)
    // Note: DownloadAnalyzing.record handles missing user/item gracefully
    [DownloadAnalyzing.record, { item: concept, user, at: download_at }, {
      download,
    }],
    // Always respond with the files (empty if concept/version not found)
    [Requesting.respond, { request, files: files_json, version, created_at }],
  ),
});
