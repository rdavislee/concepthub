# Backend Concepts & Syncs — MVP Spec (Markdown)

This single document contains all **Concept** specs (purpose, principle, SSF state, actions with *requires/effects*, queries) and the **Syncs** that compose them. Concepts are independent; composition happens only through syncs.

---

## Table of Contents

- [Backend Concepts \& Syncs — MVP Spec (Markdown)](#backend-concepts--syncs--mvp-spec-markdown)
  - [Table of Contents](#table-of-contents)
  - [Concepts](#concepts)
    - [Concept: UserAuthenticating](#concept-userauthenticating)
    - [Concept: UserSessioning](#concept-usersessioning)
    - [Concept: UserRequesting \[Request, User\]](#concept-userrequesting-request-user)
    - [Concept: UserProfileDisplaying \[User\]](#concept-userprofiledisplaying-user)
    - [Concept: ConceptRegistering \[Author\]](#concept-conceptregistering-author)
    - [Concept: DownloadAnalyzing \[Item, User\]](#concept-downloadanalyzing-item-user)
    - [Concept: Liking \[Item, User\]](#concept-liking-item-user)
    - [Concept: SimpleNaming \[Item\]](#concept-simplenaming-item)
  - [Syncs](#syncs)
    - [Auth ↔ Session](#auth--session)
    - [Request → Action → Finish/Fail](#request--action--finishfail)
    - [Registry](#registry)
    - [Likes \& Downloads](#likes--downloads)
    - [Naming](#naming)
    - [Session Hygiene](#session-hygiene)
    - [Profile Defaults](#profile-defaults)

---

## Concepts

### Concept: UserAuthenticating

**purpose**
Authenticate principals by issuing and revoking credentials and tokens so other parts of a system can trust user identity.

**principle**
A visitor registers; later they log in with credentials; while valid, they can log out or rotate tokens; expired or mismatched credentials cannot authenticate.

**state (SSF)**

```
a set of Users
a set of Credentials with
  a user User
  a hashedPassword String
  a created DateTime
a set of AccessTokens with
  a user User
  a value String
  an issuedAt DateTime
  an expiresAt DateTime
  a revoked Flag
a set of RefreshTokens with
  a user User
  a value String
  an issuedAt DateTime
  an expiresAt DateTime
  a revoked Flag
```

**actions**

* **register (email: String, password: String) : (user: Users)**
  requires: no user exists with `email`; `password` meets policy
  effects: create user; create credentials with hashed password
* **login (email: String, password: String) : (access: AccessTokens, refresh: RefreshTokens)**
  requires: user exists; password matches
  effects: issue new access+refresh; `revoked=false`
* **logout (access: AccessTokens) : (ok: Flag)**
  requires: access exists; `revoked=false`
  effects: set access.revoked := true
* **rotateTokens (refresh: RefreshTokens) : (access: AccessTokens, refresh: RefreshTokens)**
  requires: refresh exists; `revoked=false`; now < refresh.expiresAt
  effects: revoke old refresh; issue new access+refresh for same user
* **changePassword (user: Users, old: String, new: String) : (ok: Flag)**
  requires: credential matches `old`; `new` meets policy
  effects: update hashedPassword; revoke all access tokens of user

**queries**
`_userForAccess(access: AccessTokens) : (user: Users)`
`_isAccessValid(access: AccessTokens) : (valid: Flag)`

---

### Concept: UserSessioning

**purpose**
Maintain authenticated, time-boxed sessions that can begin, end, and expire.

**principle**
After a user presents valid credentials elsewhere, a session begins; while active it can end voluntarily or expire.

**state (SSF)**

```
a set of Sessions with
  a user Users
  a startedAt DateTime
  an expiresAt DateTime
  an active Flag
```

**actions**

* **beginSession (user: Users, ttlMinutes: Number) : (session: Sessions)**
  requires: ttlMinutes > 0
  effects: create session; `active=true`; set times
* **endSession (session: Sessions) : (ok: Flag)**
  requires: session exists; `active=true`
  effects: set active := false
* **system expireSession (session: Sessions) : (expired: Flag)**
  requires: now ≥ expiresAt; `active=true`
  effects: set active := false

**queries**
`_isActive(session: Sessions) : (active: Flag)`
`_sessionsOf(user: Users) : (session: Sessions)`

---

### Concept: UserRequesting [Request, User]

**purpose**
Record lifecycle of user-initiated requests (of any kind) for auditing, rate-limiting, or sync-based authorization.

**principle**
When a user initiates a request, it is recorded as started; it either finishes with a result or fails with an error; finished/failed requests are immutable history.

**state (SSF)**

```
a set of Requests with
  a requester Users
  a kind String
  a startedAt DateTime
  an optional finishedAt DateTime
  an optional error String
  a status of STARTED or FINISHED or FAILED
```

**actions**

* **start (requester: Users, kind: String, ...args) : (req: Requests)**
  requires: true
  effects: create req with status=STARTED; store args as opaque metadata if needed
* **finish (req: Requests, resultSummary: String) : (ok: Flag)**
  requires: req exists; status=STARTED
  effects: set status=FINISHED; set finishedAt; clear error
* **fail (req: Requests, message: String) : (ok: Flag)**
  requires: req exists; status=STARTED
  effects: set status=FAILED; set finishedAt; set error := message

**queries**
`_recentByUser(user: Users) : (req: Requests)`
`_byKindInWindow(kind: String, from: DateTime, to: DateTime) : (req: Requests)`

---

### Concept: UserProfileDisplaying [User]

**purpose**
Present human-readable identity attributes for users (display name, avatar, bio), independent of authentication or activity.

**principle**
A user sets profile fields; others read them for display; edits update fields without affecting other concerns.

**state (SSF)**

```
a set of Users
a set of Profiles with
  a user Users
  an optional displayName String
  an optional avatarUrl String
  an optional bio String
```

**actions**

* **setDisplayName (user: Users, name: String) : (ok: Flag)**
  requires: user exists
  effects: set displayName := name
* **setAvatar (user: Users, url: String) : (ok: Flag)**
  requires: user exists
  effects: set avatarUrl := url
* **setBio (user: Users, bio: String) : (ok: Flag)**
  requires: user exists
  effects: set bio := bio
* **clearProfile (user: Users) : (ok: Flag)**
  requires: user exists
  effects: unset display fields for user

**queries**
`_profileOf(user: Users) : (displayName: String, avatarUrl: String, bio: String)`

---

### Concept: ConceptRegistering [Author]

**purpose**
Register and version concept artifacts under unique names; allow publishing, deprecation, and yanking of versions.

**principle**
An author publishes a concept/version with a unique name and artifact location; later versions can be published; a version may be deprecated or yanked.

**state (SSF)**

```
a set of Concepts with
  a uniqueName String
  an owner Author
a set of Versions with
  a concept Concepts
  a semver String
  an artifactUrl String
  a status of DRAFT or PUBLISHED or DEPRECATED or YANKED
  a publishedAt DateTime
```

**actions**

* **reserveName (uniqueName: String, owner: Author) : (concept: Concepts)**
  requires: no concept with uniqueName
  effects: create concept with owner
* **publishVersion (concept: Concepts, semver: String, artifactUrl: String) : (version: Versions)**
  requires: concept exists; no identical semver (unless YANKED)
  effects: create version; status=PUBLISHED; set publishedAt
* **deprecate (version: Versions) : (ok: Flag)**
  requires: version exists; status=PUBLISHED
  effects: set status := DEPRECATED
* **yank (version: Versions) : (ok: Flag)**
  requires: version exists; status in {PUBLISHED, DEPRECATED}
  effects: set status := YANKED

**queries**
`_latestPublished(concept: Concepts) : (version: Versions)`
`_findByName(substring: String) : (concept: Concepts)`
`_getOwner(concept: Concepts) : (owner: Author)`
`_getOwnerOfVersion(version: Versions) : (owner: Author)`
`_getUniqueName(concept: Concepts) : (uniqueName: String)`

---

### Concept: DownloadAnalyzing [Item, User]

**purpose**
Record that a user downloaded an item, enabling analytics and rate/abuse insights (analysis via queries/consumers).

**principle**
When a download occurs it is recorded with time and identities; later, aggregates are computed via queries; records are append-only.

**state (SSF)**

```
a set of Downloads with
  a item Item
  a user Users
  a at DateTime
```

**actions**

* **record (item: Item, user: Users, at: DateTime) : (download: Downloads)**
  requires: true
  effects: create download record

**queries**
`_countForItem(item: Item, from: DateTime, to: DateTime) : (count: Number)`
`_recentForUser(user: Users) : (download: Downloads)`

---

### Concept: Liking [Item, User]

**purpose**
Let users express a binary preference for items, preventing duplicates and enabling reversals.

**principle**
A user can like an item once; unlike removes the relation.

**state (SSF)**

```
a set of Likes with
  an item Item
  a user Users
  an at DateTime
```

**actions**

* **like (item: Item, user: Users) : (ok: Flag)**
  requires: no like exists for (item,user)
  effects: create like with at := now
* **unlike (item: Item, user: Users) : (ok: Flag)**
  requires: like exists for (item,user)
  effects: delete that like

**queries**
`_isLiked(item: Item, user: Users) : (liked: Flag)`
`_count(item: Item) : (n: Number)`

---

### Concept: SimpleNaming [Item]

**purpose**
Assign and manage a human-readable display name for items.

**principle**
An item can be given a name; names can be changed or cleared; search is provided as a query.

**state (SSF)**

```
a set of Items
a set of Names with
  an item Item
  a displayName String
```

**actions**

* **setName (item: Item, name: String) : (ok: Flag)**
  requires: item exists; name nonempty
  effects: upsert Names for item with displayName := name
* **clearName (item: Item) : (ok: Flag)**
  requires: item exists
  effects: delete any Names for item

**queries**
`_findByPrefix(prefix: String) : (item: Item)`
`_nameOf(item: Item) : (displayName: String)`

---

## Syncs

> Notation:
> `when` (triggers) — may bind variables
> `where` (guards via queries) — must hold for `then` to fire
> `then` (emitted actions) — may fan out across multiple frames

### Auth ↔ Session

**LoginStartsSession**

```
sync LoginStartsSession
when
  UserAuthenticating.login (email, password) : (access, refresh)
where
  user is UserAuthenticating._userForAccess ( access )
then
  UserSessioning.beginSession ( user, ttlMinutes: 60 )
```

**LogoutEndsSessions**

```
sync LogoutEndsSessions
when
  UserAuthenticating.logout ( access ) : (ok)
where
  user is UserAuthenticating._userForAccess ( access )
  in UserSessioning: _sessionsOf ( user ) gets session
then
  UserSessioning.endSession ( session )
```

---

### Request → Action → Finish/Fail

**Login**

```
sync AuthLoginRequest
when
  UserRequesting.start ( requester, kind: "/auth/login", email, password ) : (req)
then
  UserAuthenticating.login ( email, password )

sync AuthLoginFinish
when
  UserRequesting.start ( kind: "/auth/login" ) : (req)
  UserAuthenticating.login () : (access, refresh)
then
  UserRequesting.finish ( req, resultSummary: "ok: login" )

sync AuthLoginError
when
  UserRequesting.start ( kind: "/auth/login" ) : (req)
  UserAuthenticating.login () : (error)
then
  UserRequesting.fail ( req, message: error )
```

**Register**

```
sync AuthRegisterRequest
when
  UserRequesting.start ( requester, kind: "/auth/register", email, password ) : (req)
then
  UserAuthenticating.register ( email, password )

sync AuthRegisterFinish
when
  UserRequesting.start ( kind: "/auth/register" ) : (req)
  UserAuthenticating.register () : (user)
then
  UserRequesting.finish ( req, resultSummary: "ok: registered" )

sync AuthRegisterError
when
  UserRequesting.start ( kind: "/auth/register" ) : (req)
  UserAuthenticating.register () : (error)
then
  UserRequesting.fail ( req, message: error )
```

**Logout**

```
sync AuthLogoutRequest
when
  UserRequesting.start ( requester, kind: "/auth/logout", access ) : (req)
then
  UserAuthenticating.logout ( access )

sync AuthLogoutFinish
when
  UserRequesting.start ( kind: "/auth/logout" ) : (req)
  UserAuthenticating.logout () : (ok)
then
  UserRequesting.finish ( req, resultSummary: "ok: logout" )
```

---

### Registry

**Reserve name**

```
sync ConceptsReserveName
when
  UserRequesting.start ( requester, kind: "/concepts/reserve", uniqueName ) : (req)
then
  ConceptRegistering.reserveName ( uniqueName, owner: requester )

sync ConceptsReserveNameFinish
when
  UserRequesting.start ( kind: "/concepts/reserve" ) : (req)
  ConceptRegistering.reserveName () : (concept)
then
  UserRequesting.finish ( req, resultSummary: "ok: reserved" )
```

**Publish with owner check**

```
sync ConceptsPublishRequest
when
  UserRequesting.start ( requester, kind: "/concepts/publish", concept, semver, artifactUrl ) : (req)
where
  in ConceptRegistering: _getOwner ( concept ) gets owner
  requester == owner
then
  ConceptRegistering.publishVersion ( concept, semver, artifactUrl )

sync ConceptsPublishForbidden
when
  UserRequesting.start ( requester, kind: "/concepts/publish", concept ) : (req)
where
  in ConceptRegistering: _getOwner ( concept ) gets owner
  requester != owner
then
  UserRequesting.fail ( req, message: "forbidden: not owner" )

sync ConceptsPublishFinish
when
  UserRequesting.start ( kind: "/concepts/publish" ) : (req)
  ConceptRegistering.publishVersion () : (version)
then
  UserRequesting.finish ( req, resultSummary: "ok: published" )
```

**Deprecate / Yank (owner-gated)**

```
sync ConceptsDeprecate
when
  UserRequesting.start ( requester, kind: "/concepts/deprecate", version ) : (req)
where
  in ConceptRegistering: _getOwnerOfVersion ( version ) gets owner
  requester == owner
then
  ConceptRegistering.deprecate ( version )

sync ConceptsYank
when
  UserRequesting.start ( requester, kind: "/concepts/yank", version ) : (req)
where
  in ConceptRegistering: _getOwnerOfVersion ( version ) gets owner
  requester == owner
then
  ConceptRegistering.yank ( version )
```

---

### Likes & Downloads

**Like / Unlike**

```
sync LikeRequest
when
  UserRequesting.start ( requester, kind: "/concepts/like", item ) : (req)
then
  Liking.like ( item, requester )

sync LikeFinish
when
  UserRequesting.start ( kind: "/concepts/like" ) : (req)
  Liking.like () : (ok)
then
  UserRequesting.finish ( req, resultSummary: "ok: liked" )

sync UnlikeRequest
when
  UserRequesting.start ( requester, kind: "/concepts/unlike", item ) : (req)
then
  Liking.unlike ( item, requester )

sync UnlikeFinish
when
  UserRequesting.start ( kind: "/concepts/unlike" ) : (req)
  Liking.unlike () : (ok)
then
  UserRequesting.finish ( req, resultSummary: "ok: unliked" )
```

**Record download**

```
sync DownloadRecord
when
  UserRequesting.start ( requester, kind: "/concepts/download", item ) : (req)
then
  DownloadAnalyzing.record ( item, requester, at: now )

sync DownloadFinish
when
  UserRequesting.start ( kind: "/concepts/download" ) : (req)
  DownloadAnalyzing.record () : (download)
then
  UserRequesting.finish ( req, resultSummary: "ok: recorded" )
```

---

### Naming

**Auto-name on reserve (default display name = uniqueName)**

```
sync AutoNameOnReserve
when
  ConceptRegistering.reserveName ( uniqueName ) : (concept)
then
  SimpleNaming.setName ( item: concept, name: uniqueName )
```

**Restore name to uniqueName if cleared**

```
sync RestoreNameIfCleared
when
  SimpleNaming.clearName ( item ) : (ok)
where
  in ConceptRegistering: _getUniqueName ( item ) gets uniqueName
then
  SimpleNaming.setName ( item, name: uniqueName )
```

---

### Session Hygiene

**Expire active sessions automatically**

```
sync AutoExpireSessions
when
  UserSessioning.expireSession ( session ) : (expired)
then
  // terminal housekeeping; no follow-on action
```

**End all sessions on password change**

```
sync PasswordChangeEndsSessions
when
  UserAuthenticating.changePassword ( user, old, new ) : (ok)
where
  in UserSessioning: _sessionsOf ( user ) gets session
then
  UserSessioning.endSession ( session )
```

---

### Profile Defaults

**Set default display name on register**

```
sync DefaultDisplayNameOnRegister
when
  UserAuthenticating.register ( email, password ) : (user)
then
  UserProfileDisplaying.setDisplayName ( user, name: email )
```
