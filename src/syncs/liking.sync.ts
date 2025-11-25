import { actions, Sync } from "@engine";
import { Liking, Requesting, UserSessioning } from "@concepts";

// Like concept (session required)
export const LikeRequest: Sync = ({ request, item, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/concepts/like", item, session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserSessioning._getUser, { session }, { user });
    return frames; // if no user binding, no then firing
  },
  then: actions([Liking.like, { item, user }]),
});

export const LikeRespondSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/like" }, { request }],
    [Liking.like, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const LikeRespondError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/like" }, { request }],
    [Liking.like, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Unlike concept (session required)
export const UnlikeRequest: Sync = ({ request, item, session, user }) => ({
  when: actions([Requesting.request, {
    path: "/concepts/unlike",
    item,
    session,
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(UserSessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions([Liking.unlike, { item, user }]),
});

export const UnlikeRespondSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/unlike" }, { request }],
    [Liking.unlike, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const UnlikeRespondError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/unlike" }, { request }],
    [Liking.unlike, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
