import { actions, Frames, Sync } from "@engine";
import {
  ConceptRegistering,
  ConceptVersioning,
  DownloadAnalyzing,
  Requesting,
  UserSessioning,
} from "@concepts";

/**
 * DownloadSpecificVersion
 *
 * When a user requests to download a specific version of a concept,
 * retrieve the files for that version and record the download.
 */
export const DownloadSpecificVersion: Sync = (
  {
    request,
    unique_name,
    concept,
    version,
    user,
    files,
    files_json,
    created_at,
    download,
    accessToken,
    version_num,
  },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/concepts/download/version", unique_name, version, accessToken },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requestedVersion = originalFrame[version] as number | undefined;

    // Authenticate User
    frames = await frames.query(
      UserSessioning._getUser,
      { session: accessToken },
      { user },
    );
    frames = frames.filter(($) => $[user] !== undefined);
    if (frames.length === 0) return [];

    // Get concept ID using _lookup query
    const lookupFrames = await frames.query(ConceptRegistering._lookup, { unique_name }, { id: concept });
    
    if (lookupFrames.length === 0) {
      return [];
    }
    const conceptId = lookupFrames[0][concept];

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
        return [];
      }
    }

    // Get the files for the specific version
    frames = await new Frames({ ...originalFrame, [concept]: conceptId, [user]: frames[0][user] }).query(
      ConceptVersioning._download,
      { concept: conceptId, version: versionToDownload },
      { files, created_at },
    );

    if (frames.length === 0) return [];

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
    // We also need 'created_at' for response
    return new Frames({
      ...frames[0],
      [files_json]: textFiles,
      [version]: versionToDownload, // Ensure correct version is bound
    });
  },
  then: actions(
    // Record the download analysis
    [DownloadAnalyzing.record, { item: concept, user, at: new Date() }, {
      download,
    }],
    // Respond with the files
    [Requesting.respond, { request, files: files_json, version, created_at }],
  ),
});
