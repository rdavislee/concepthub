import { actions, Sync } from "@engine";
import { Requesting, UserAuthenticating, UserSessioning } from "@concepts";

//-- User Registration --//
export const RegisterRequest: Sync = ({ request, email, password }) => ({
  when: actions([Requesting.request, {
    path: "/auth/register",
    email,
    password,
  }, { request }]),
  then: actions([UserAuthenticating.register, { email, password }]),
});

export const RegisterSuccessCreatesSession: Sync = ({ user }) => ({
  when: actions([UserAuthenticating.register, {}, { user }]),
  then: actions([UserSessioning.create, { user }]),
});

export const RegisterResponseSuccess: Sync = ({
  request,
  user,
  accessToken,
  refreshToken,
}) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register" }, { request }],
    [UserAuthenticating.register, {}, { user }],
    [UserSessioning.create, {}, { accessToken, refreshToken }],
  ),
  then: actions([
    Requesting.respond,
    { request, accessToken, refreshToken, user },
  ]),
});

export const RegisterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register" }, { request }],
    [UserAuthenticating.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Login & Session Creation --//
export const LoginRequest: Sync = ({ request, email, password }) => ({
  when: actions([Requesting.request, {
    path: "/auth/login",
    email,
    password,
  }, { request }]),
  then: actions([UserAuthenticating.login, { email, password }]),
});

export const LoginSuccessCreatesSession: Sync = ({ user }) => ({
  when: actions([UserAuthenticating.login, {}, { user }]),
  then: actions([UserSessioning.create, { user }]),
});

export const LoginResponseSuccess: Sync = ({
  request,
  user,
  accessToken,
  refreshToken,
}) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [UserAuthenticating.login, {}, { user }],
    [UserSessioning.create, {}, { accessToken, refreshToken }],
  ),
  then: actions([
    Requesting.respond,
    { request, accessToken, refreshToken, user },
  ]),
});

export const LoginResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [UserAuthenticating.login, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Token Refresh --//
// Clients send refreshToken in the request body to get a new token pair
export const RefreshRequest: Sync = ({ request, refreshToken }) => ({
  when: actions([Requesting.request, {
    path: "/auth/refresh",
    refreshToken,
  }, { request }]),
  then: actions([UserSessioning.refresh, { refreshToken }]),
});

export const RefreshResponseSuccess: Sync = ({
  request,
  accessToken,
  refreshToken,
}) => ({
  when: actions(
    [Requesting.request, { path: "/auth/refresh" }, { request }],
    [UserSessioning.refresh, {}, { accessToken, refreshToken }],
  ),
  then: actions([
    Requesting.respond,
    { request, accessToken, refreshToken },
  ]),
});

export const RefreshResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/refresh" }, { request }],
    [UserSessioning.refresh, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Logout --//
// Clients send accessToken in the request body
export const LogoutRequest: Sync = ({ request, accessToken, user }) => ({
  when: actions([Requesting.request, { path: "/auth/logout", accessToken }, {
    request,
  }]),
  where: async (frames) => {
    // Map accessToken to session (Session type is the access token string)
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserSessioning.delete, { session: accessToken }]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout" }, { request }],
    [UserSessioning.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "logged_out" }]),
});

//-- Session Validation (frontend may poll /UserSessioning/_getUser) --//
// Clients send accessToken in the request body
export const SessionValidationSuccess: Sync = (
  { request, accessToken, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/auth/_getUser", accessToken },
    { request },
  ]),
  where: async (frames) => {
    // Map accessToken to session (Session type is the access token string)
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([Requesting.respond, { request, user }]),
});

export const SessionValidationError: Sync = (
  { request, accessToken, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/auth/_getUser", accessToken },
    { request },
  ]),
  where: async (frames) => {
    // Map accessToken to session (Session type is the access token string)
    frames = await frames.query(UserSessioning._getUser, {
      session: accessToken,
    }, { error });
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions([Requesting.respond, { request, error }]),
});
