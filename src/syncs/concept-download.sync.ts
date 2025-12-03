import { actions, Sync } from "@engine";
import {
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
    concept,
    version,
    user,
    files,
    created_at,
    download,
  },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/concepts/download/version", concept, version },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(
      UserSessioning._getUser,
      { session: request.session },
      { user },
    );

    // Get the files for the specific version
    frames = await frames.query(
      ConceptVersioning._download,
      { concept, version },
      { files, created_at },
    );

    return frames;
  },
  then: actions(
    // Record the download analysis
    [DownloadAnalyzing.record, { item: concept, user, at: new Date() }, {
      download,
    }],
    // Respond with the files
    [Requesting.respond, { request, files, created_at }],
  ),
});
