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

### concept: UserAuthentication [User]

*   **purpose**: To securely verify a user's identity based on credentials.
*   **principle**: If you register with a unique username and a password, and later provide the same credentials to log in, you will be successfully identified as that user.
*   **state**:
    *   a set of `User`s with
        *   a `username` String (unique)
        *   a `passwordHash` String
*   **actions**:
    *   `register (username: String, password: String): (user: User)`
        *   **requires**: no User exists with the given `username`.
        *   **effects**: creates a new User `u`; sets their `username` and a hash of their `password`; returns `u` as `user`.
    *   `register (username: String, password: String): (error: String)`
        *   **requires**: a User already exists with the given `username`.
        *   **effects**: returns an error message.
    *   `login (username: String, password: String): (user: User)`
        *   **requires**: a User exists with the given `username` and the `password` matches their `passwordHash`.
        *   **effects**: returns the matching User `u` as `user`.
    *   `login (username: String, password: String): (error: String)`
        *   **requires**: no User exists with the given `username` or the `password` does not match.
        *   **effects**: returns an error message.
*   **queries**:
    *   `_getUserByUsername (username: String): (user: User)`
        *   **requires**: a User with the given `username` exists.
        *   **effects**: returns the corresponding User.

---

### concept: UserSessioning [User, Session]

*   **purpose**: To maintain a user's logged-in state across multiple requests without re-sending credentials.
*   **principle**: After a user is authenticated, a session is created for them. Subsequent requests using that session's ID are treated as being performed by that user, until the session is deleted (logout).
*   **state**:
    *   a set of `Session`s with
        *   a `user` User
*   **actions**:
    *   `create (user: User): (session: Session)`
        *   **requires**: true.
        *   **effects**: creates a new Session `s`; associates it with the given `user`; returns `s` as `session`.
    *   `delete (session: Session): ()`
        *   **requires**: the given `session` exists.
        *   **effects**: removes the session `s`.
*   **queries**:
    *   `_getUser (session: Session): (user: User)`
        *   **requires**: the given `session` exists.
        *   **effects**: returns the user associated with the session.

---

### Concept: UserRequesting [Request]

**purpose**
Encapsulate incoming external API requests and their asynchronous responses, allowing other concepts to react and supply a response.

**principle**
Every external HTTP call creates a request record with arbitrary input fields; later a single response is produced and returned to the caller; unresolved requests may timeout.

**state (SSF)**

```
a set of Requests with
  an input OpaqueRecord
  an optional response OpaqueRecord
  a createdAt DateTime
```

**actions**

* **request (path: String, ...params) : (request: Requests)**
  requires: true
  effects: create request with input containing path + params; in-flight until responded
* **respond (request: Requests, ...result) : (request: Requests)**
  requires: request exists; no previous response
  effects: attach result as response; resolve any awaiting parties

**queries**
`_awaitResponse(request: Requests) : (response: OpaqueRecord)`

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
`_artifactUrlOfVersion(version: Versions) : (artifactUrl: String)`

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

> Updated for current concept code: `UserAuthenticating.register`, `UserAuthenticating.authenticate`, `UserSessioning.beginSession`, `UserSessioning.endSession`, `UserSessioning.makeRequest`.

**RegisterFlow**

```
sync RegisterRequest
when
  UserRequesting.request ( path: "/auth/register", email, password ) : (request)
then
  UserAuthenticating.register ( email, password )

sync RegisterRespondSuccess
when
  UserRequesting.request ( path: "/auth/register" ) : (request)
  UserAuthenticating.register () : (user)
then
  UserSessioning.beginSession ( user )
  UserRequesting.respond ( request, user )

sync RegisterRespondError
when
  UserRequesting.request ( path: "/auth/register" ) : (request)
  UserAuthenticating.register () : (error)
then
  UserRequesting.respond ( request, error )
```

**LoginFlow**

```
sync LoginRequest
when
  UserRequesting.request ( path: "/auth/login", email, password ) : (request)
then
  UserAuthenticating.authenticate ( email, password )

sync LoginRespondSuccess
when
  UserRequesting.request ( path: "/auth/login" ) : (request)
  UserAuthenticating.authenticate () : (user)
then
  UserSessioning.beginSession ( user: user._id )
  UserRequesting.respond ( request, user )

sync LoginRespondError
when
  UserRequesting.request ( path: "/auth/login" ) : (request)
  UserAuthenticating.authenticate () : (error)
then
  UserRequesting.respond ( request, error )
```

**LogoutFlow**

```
sync LogoutRequest
when
  UserRequesting.request ( path: "/auth/logout", session ) : (request)
then
  UserSessioning.endSession ( session )

sync LogoutRespondSuccess
when
  UserRequesting.request ( path: "/auth/logout" ) : (request)
  UserSessioning.endSession () : (ok)
then
  UserRequesting.respond ( request, ok )

sync LogoutRespondError
when
  UserRequesting.request ( path: "/auth/logout" ) : (request)
  UserSessioning.endSession () : (error)
then
  UserRequesting.respond ( request, error )
```

---

### Request → Action → Response

> Legacy start/finish/fail replaced by request/respond/_awaitResponse.

---

### Registry

All concept registration operations require a valid session. The session maps to a user via `UserSessioning._getUser` and that user becomes the owner (on reserve) or must match the existing owner (on publish/deprecate/yank).

**Reserve name (session required)**

```
sync ReserveNameRequest
when
  UserRequesting.request ( path: "/concepts/reserve", uniqueName, session ) : (request)
where
  owner is UserSessioning._getUser ( session )
then
  ConceptRegistering.reserveName ( uniqueName, owner )

sync ReserveNameRespondSuccess
when
  UserRequesting.request ( path: "/concepts/reserve" ) : (request)
  ConceptRegistering.reserveName () : (concept)
then
  UserRequesting.respond ( request, concept )

sync ReserveNameRespondError
when
  UserRequesting.request ( path: "/concepts/reserve" ) : (request)
  ConceptRegistering.reserveName () : (error)
then
  UserRequesting.respond ( request, error )
```

**Publish version (owner & session required)**

```
sync PublishVersionRequest
when
  UserRequesting.request ( path: "/concepts/publish", concept, semver, artifactUrl, session ) : (request)
where
  user is UserSessioning._getUser ( session )
  in ConceptRegistering: _getOwner ( concept ) gets owner
  user == owner
then
  ConceptRegistering.publishVersion ( concept, semver, artifactUrl )

sync PublishVersionForbidden
when
  UserRequesting.request ( path: "/concepts/publish", concept, semver, artifactUrl, session ) : (request)
where
  user is UserSessioning._getUser ( session )
  in ConceptRegistering: _getOwner ( concept ) gets owner
  user != owner
then
  UserRequesting.respond ( request, error: "forbidden: not owner" )

sync PublishVersionRespondSuccess
when
  UserRequesting.request ( path: "/concepts/publish" ) : (request)
  ConceptRegistering.publishVersion () : (version)
then
  UserRequesting.respond ( request, version )

sync PublishVersionRespondError
when
  UserRequesting.request ( path: "/concepts/publish" ) : (request)
  ConceptRegistering.publishVersion () : (error)
then
  UserRequesting.respond ( request, error )
```

**Deprecate / Yank (owner & session required)**

```
sync DeprecateRequest
when
  UserRequesting.request ( path: "/concepts/deprecate", version, session ) : (request)
where
  user is UserSessioning._getUser ( session )
  in ConceptRegistering: _getOwnerOfVersion ( version ) gets owner
  user == owner
then
  ConceptRegistering.deprecate ( version )

sync DeprecateForbidden
when
  UserRequesting.request ( path: "/concepts/deprecate", version, session ) : (request)
where
  user is UserSessioning._getUser ( session )
  in ConceptRegistering: _getOwnerOfVersion ( version ) gets owner
  user != owner
then
  UserRequesting.respond ( request, error: "forbidden: not owner" )

sync DeprecateRespond
when
  UserRequesting.request ( path: "/concepts/deprecate" ) : (request)
  ConceptRegistering.deprecate () : (ok)
then
  UserRequesting.respond ( request, ok )

sync YankRequest
when
  UserRequesting.request ( path: "/concepts/yank", version, session ) : (request)
where
  user is UserSessioning._getUser ( session )
  in ConceptRegistering: _getOwnerOfVersion ( version ) gets owner
  user == owner
then
  ConceptRegistering.yank ( version )

sync YankForbidden
when
  UserRequesting.request ( path: "/concepts/yank", version, session ) : (request)
where
  user is UserSessioning._getUser ( session )
  in ConceptRegistering: _getOwnerOfVersion ( version ) gets owner
  user != owner
then
  UserRequesting.respond ( request, error: "forbidden: not owner" )

sync YankRespond
when
  UserRequesting.request ( path: "/concepts/yank" ) : (request)
  ConceptRegistering.yank () : (ok)
then
  UserRequesting.respond ( request, ok )
```

---

### Likes & Downloads

**Like / Unlike (session required)**

```
sync LikeRequest
when
  UserRequesting.request ( path: "/concepts/like", item, session ) : (request)
where
  user is UserSessioning._getUser ( session )
then
  UserSessioning.makeRequest ( session )
  Liking.like ( item, user )

sync LikeRespondSuccess
when
  UserRequesting.request ( path: "/concepts/like" ) : (request)
  Liking.like () : (ok)
then
  UserRequesting.respond ( request, ok )

sync LikeRespondError
when
  UserRequesting.request ( path: "/concepts/like" ) : (request)
  Liking.like () : (error)
then
  UserRequesting.respond ( request, error )

sync UnlikeRequest
when
  UserRequesting.request ( path: "/concepts/unlike", item, session ) : (request)
where
  user is UserSessioning._getUser ( session )
then
  UserSessioning.makeRequest ( session )
  Liking.unlike ( item, user )

sync UnlikeRespondSuccess
when
  UserRequesting.request ( path: "/concepts/unlike" ) : (request)
  Liking.unlike () : (ok)
then
  UserRequesting.respond ( request, ok )

sync UnlikeRespondError
when
  UserRequesting.request ( path: "/concepts/unlike" ) : (request)
  Liking.unlike () : (error)
then
  UserRequesting.respond ( request, error )
```

**Record download (public)**

```
sync DownloadRequest
when
  UserRequesting.request ( path: "/concepts/download", item, user ) : (request)
then
  DownloadAnalyzing.record ( item, user, at: now )

sync DownloadRespond
when
  UserRequesting.request ( path: "/concepts/download" ) : (request)
  DownloadAnalyzing.record () : (download)
then
  UserRequesting.respond ( request, download )
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
