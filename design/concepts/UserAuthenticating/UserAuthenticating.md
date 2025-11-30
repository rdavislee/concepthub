# Concept: UserAuthenticating [User]

**purpose**
To securely verify a user's identity based on credentials.

**principle**
If you register with a unique email and a password, and later provide the same credentials to log in, you will be successfully identified as that user.

**state (SSF)**

```ssf
a set of Users with
  an email String (unique)
  a passwordHash String
```

**actions**

* **register (email: String, password: String): (user: User)**
  requires: no User exists with the given `email`.
  effects: creates a new User `u`; sets their `email` and a hash of their `password`; returns `u` as `user`.

* **register (email: String, password: String): (error: String)**
  requires: a User already exists with the given `email`.
  effects: returns an error message.

* **login (email: String, password: String): (user: User)**
  requires: a User exists with the given `email` and the `password` matches their `passwordHash`.
  effects: returns the matching User `u` as `user`.

* **login (email: String, password: String): (error: String)**
  requires: no User exists with the given `email` or the `password` does not match.
  effects: returns an error message.

**queries**

* **_getUserByEmail (email: String): (user: User)**
  requires: a User with the given `email` exists.
  effects: returns the corresponding User.
