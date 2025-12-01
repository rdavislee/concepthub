### Concept: ConceptRegistering [User]

**purpose**
Capture registered concepts with unique names so they can be managed, renamed, or removed later, preserving authorship.

**principle**
Every registered concept has a unique name and an author; adding creates new records, changing the name updates them, and removing deletes them.

**state (SSF)**

```
a set of Concept with
  a unique_name String
  an author Users
  a created_at DateTime
  an updated_at DateTime
```

**actions**

* **add (unique_name: String, author: Users) : (id: Item)**
  requires: unique_name is not already used
  effects: create concept with id := fresh, unique_name := unique_name, author := author, created_at := now, updated_at := now
* **changeName (id: Item, unique_name: String) : (ok: Flag)**
  requires: concept exists for id; unique_name is not already used
  effects: set unique_name := unique_name, updated_at := now
* **remove (id: Item) : (ok: Flag)**
  requires: concept exists for id
  effects: delete that concept

---
