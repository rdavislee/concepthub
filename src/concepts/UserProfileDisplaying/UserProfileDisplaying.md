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

