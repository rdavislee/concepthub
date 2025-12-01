# Concept: UserProfileDisplaying [User]

**purpose**
Present human-readable identity attributes for users (display name, avatar, bio), independent of authentication or activity.

**principle**
A user sets profile fields; others read them for display; edits update fields without affecting other concerns.

**state (SSF)**

```ssf
a set of Users
a set of Profiles with
  a user Users
  an optional displayName String
  an optional avatarUrl String
  an optional bio String
```

**actions**

* **setProfile (user: Users, displayName: String, avatarUrl: String, bio: String) : (ok: Flag)**
  requires: user exists
  effects: set only the provided fields, leaving others unchanged

**queries**

* **_profileOf(user: Users) : (displayName: String, avatarUrl: String, bio: String)**
  requires: user exists
  effects: returns the profile fields for the user

