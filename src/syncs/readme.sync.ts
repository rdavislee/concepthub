import { actions, Frames as _Frames, Sync } from "@engine";
import {
  ConceptRegistering,
  ConceptVersioning,
  ReadmeGenerating,
  Requesting,
  UserSessioning,
} from "@concepts";

/**
 * README Generation Syncs
 * - After a successful authenticated publish (new or existing), generate README for the concept.
 * - Modular and minimal: only depends on emitted actions, no direct request handling.
 */

// Frame symbols for plumbing query outputs
const version = Symbol("version");
const files = Symbol("files");

// Trigger on new concept publish completion
export const GenerateReadmeOnPublishNew: Sync = ({ concept }) => ({
  when: actions([
    ConceptRegistering.addVersion,
    { concept },
    {},
  ]),
  where: async (frames) => {
    frames = await frames.query(ConceptVersioning._get, { concept }, {
      version,
    });
    frames = await frames.query(ConceptVersioning._download, {
      concept,
      version,
    }, { files });
    return frames;
  },
  then: actions([ReadmeGenerating.generate, {
    concept,
    overwrite: false,
    files,
  }]),
});

// Trigger on existing concept publish completion
export const GenerateReadmeOnPublishExisting: Sync = (
  { concept, version },
) => ({
  when: actions(
    [ConceptVersioning.upload, {}, { id: version }],
    [ConceptRegistering.addVersion, { concept }, {}],
  ),
  where: async (frames) => {
    frames = await frames.query(ConceptVersioning._get, { concept }, {
      version,
    });
    frames = await frames.query(ConceptVersioning._download, {
      concept,
      version,
    }, { files });
    return frames;
  },
  then: actions([ReadmeGenerating.generate, {
    concept,
    overwrite: false,
    files,
  }]),
});

// Optional: Regenerate README on explicit request endpoint (requires authentication upstream)
export const GenerateReadmeOnRequest: Sync = (
  { request, concept, overwrite },
) => ({
  when: actions([Requesting.request, {
    path: "/readme/generate",
    concept,
    overwrite,
  }, { request }]),
  // Rely on upstream auth syncs that guard Requesting.request with accessToken; keep modular here
  where: async (frames) => {
    frames = await frames.query(ConceptVersioning._get, { concept }, {
      version,
    });
    frames = await frames.query(ConceptVersioning._download, {
      concept,
      version,
    }, { files });
    return frames;
  },
  then: actions([ReadmeGenerating.generate, { concept, overwrite, files }]),
});

// Respond to /readme/generate once generation completes
export const RespondReadmeOnRequest: Sync = (
  { request, concept, path, content, overwritten },
) => ({
  when: actions(
    [Requesting.request, { path: "/readme/generate" }, { request }],
    [ReadmeGenerating.generate, { concept }, { path, content, overwritten }],
  ),
  then: actions([
    Requesting.respond,
    { request, ok: true, concept, path, content, overwritten },
  ]),
});

// Auth-guarded README generation for UI button (supports extra fields)
export const GenerateReadmeFromButton: Sync = ({
  request,
  accessToken,
  user,
  concept,
  overwrite,
  displayName,
  actions: actionList,
  files,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/readme/generate",
      concept,
      overwrite,
      displayName,
      actions: actionList,
      files,
      accessToken,
    },
    { request },
  ]),
  where: async (frames) => {
    // Require authenticated user
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    frames = frames.filter(($) => $[user] !== undefined);
    // Fetch latest files if not provided by UI
    if (!files) {
      frames = await frames.query(ConceptVersioning._get, { concept }, {
        version,
      });
      frames = await frames.query(ConceptVersioning._download, {
        concept,
        version,
      }, { files });
    } else {
      // Attach provided files to frames so generate can consume them
      frames = frames.map(($) => ({ ...$, [files]: files }));
    }
    return frames;
  },
  then: actions(
    [ReadmeGenerating.generate, {
      concept,
      overwrite,
      displayName,
      actions: actionList,
      files,
    }],
    [Requesting.respond, { request, ok: true, concept }],
  ),
});
