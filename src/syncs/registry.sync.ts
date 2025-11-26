import { actions, Sync } from "@engine";
import {
  ConceptRegistering,
  Requesting,
  UserSessioning,
} from "@concepts";

// Reserve name (session required)
export const ReserveNameRequest: Sync = (
  { request, uniqueName, session, user },
) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/reserve", uniqueName, session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    return frames.filter((frame) => frame[user] !== undefined);
  },
  then: actions([ConceptRegistering.reserveName, { uniqueName, owner: user }]),
});

export const ReserveNameRespondSuccess: Sync = ({ request, concept }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/reserve" }, { request }],
    [ConceptRegistering.reserveName, {}, { concept }],
  ),
  then: actions([Requesting.respond, { request, concept }]),
});

export const ReserveNameRespondError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/reserve" }, { request }],
    [ConceptRegistering.reserveName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Publish version (owner & session required)
export const PublishVersionRequest: Sync = (
  { request, concept, semver, artifactUrl, session, user, owner },
) => ({
  when: actions([Requesting.request, {
    path: "/concepts/publish",
    concept,
    semver,
    artifactUrl,
    session,
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    frames = await frames.query(
      ConceptRegistering._getOwner,
      { concept },
      { owner },
    );
    return frames.filter((frame) =>
      frame[user] !== undefined &&
      frame[owner] !== undefined &&
      frame[user] === frame[owner]
    );
  },
  then: actions([ConceptRegistering.publishVersion, {
    concept,
    semver,
    artifactUrl,
  }]),
});

export const PublishVersionForbidden: Sync = (
  { request, concept, semver, artifactUrl, session, user, owner },
) => ({
  when: actions([Requesting.request, {
    path: "/concepts/publish",
    concept,
    semver,
    artifactUrl,
    session,
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    frames = await frames.query(
      ConceptRegistering._getOwner,
      { concept },
      { owner },
    );
    return frames.filter((frame) =>
      frame[user] !== undefined &&
      frame[owner] !== undefined &&
      frame[user] !== frame[owner]
    );
  },
  then: actions([Requesting.respond, {
    request,
    error: "forbidden: not owner",
  }]),
});

export const PublishVersionRespondSuccess: Sync = ({ request, version }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/publish" }, { request }],
    [ConceptRegistering.publishVersion, {}, { version }],
  ),
  then: actions([Requesting.respond, { request, version }]),
});

export const PublishVersionRespondError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/publish" }, { request }],
    [ConceptRegistering.publishVersion, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Deprecate (owner & session required)
export const DeprecateRequest: Sync = (
  { request, version, session, user, owner },
) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/deprecate", version, session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    frames = await frames.query(
      ConceptRegistering._getOwnerOfVersion,
      { version },
      { owner },
    );
    return frames.filter((frame) =>
      frame[user] !== undefined &&
      frame[owner] !== undefined &&
      frame[user] === frame[owner]
    );
  },
  then: actions([ConceptRegistering.deprecate, { version }]),
});

export const DeprecateForbidden: Sync = (
  { request, version, session, user, owner },
) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/deprecate", version, session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    frames = await frames.query(
      ConceptRegistering._getOwnerOfVersion,
      { version },
      { owner },
    );
    return frames.filter((frame) =>
      frame[user] !== undefined &&
      frame[owner] !== undefined &&
      frame[user] !== frame[owner]
    );
  },
  then: actions([Requesting.respond, {
    request,
    error: "forbidden: not owner",
  }]),
});

export const DeprecateRespond: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/deprecate" }, { request }],
    [ConceptRegistering.deprecate, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

// Yank (owner & session required)
export const YankRequest: Sync = (
  { request, version, session, user, owner },
) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/yank", version, session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    frames = await frames.query(
      ConceptRegistering._getOwnerOfVersion,
      { version },
      { owner },
    );
    return frames.filter((frame) =>
      frame[user] !== undefined &&
      frame[owner] !== undefined &&
      frame[user] === frame[owner]
    );
  },
  then: actions([ConceptRegistering.yank, { version }]),
});

export const YankForbidden: Sync = (
  { request, version, session, user, owner },
) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/yank", version, session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(
      UserSessioning._getUser,
      { session },
      { user },
    );
    frames = await frames.query(
      ConceptRegistering._getOwnerOfVersion,
      { version },
      { owner },
    );
    return frames.filter((frame) =>
      frame[user] !== undefined &&
      frame[owner] !== undefined &&
      frame[user] !== frame[owner]
    );
  },
  then: actions([Requesting.respond, {
    request,
    error: "forbidden: not owner",
  }]),
});

export const YankRespond: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/yank" }, { request }],
    [ConceptRegistering.yank, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});
