import { actions, Sync } from "@engine";
import { Requesting, UserAuthenticating, UserSessioning } from "@concepts";

//-- User Registration --//
export const RegisterRequest: Sync = ({ request, username, password }) => ({
  when: actions([Requesting.request, {
    path: "/UserAuthenticating/register",
    username,
    password,
  }, { request }]),
  then: actions([UserAuthenticating.register, { username, password }]),
});

export const RegisterResponseSuccess: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthenticating/register" }, { request }],
    [UserAuthenticating.register, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

export const RegisterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthenticating/register" }, { request }],
    [UserAuthenticating.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Login & Session Creation --//
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([Requesting.request, {
    path: "/UserAuthenticating/login",
    username,
    password,
  }, { request }]),
  then: actions([UserAuthenticating.login, { username, password }]),
});

export const LoginSuccessCreatesSession: Sync = ({ user }) => ({
  when: actions([UserAuthenticating.login, {}, { user }]),
  then: actions([UserSessioning.create, { user }]),
});

export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthenticating/login" }, { request }],
    [UserAuthenticating.login, {}, { user }],
    [UserSessioning.create, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, session, user }]),
});

export const LoginResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthenticating/login" }, { request }],
    [UserAuthenticating.login, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Logout --//
export const LogoutRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/logout", session }, {
    request,
  }]),
  where: (frames) =>
    frames.query(UserSessioning._getUser, { session }, { user }),
  then: actions([UserSessioning.delete, { session }]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [UserSessioning.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "logged_out" }]),
});

//-- Session Validation (frontend may poll /UserSessioning/_getUser) --//
export const SessionValidationSuccess: Sync = (
  { request, session, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserSessioning/_getUser", session },
    { request },
  ]),
  where: (frames) =>
    frames.query(UserSessioning._getUser, { session }, { user }),
  then: actions([Requesting.respond, { request, user }]),
});

export const SessionValidationError: Sync = (
  { request, session, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserSessioning/_getUser", session },
    { request },
  ]),
  where: (frames) =>
    frames.query(UserSessioning._getUser, { session }, { error }),
  then: actions([Requesting.respond, { request, error }]),
});
