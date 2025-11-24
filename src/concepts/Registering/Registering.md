### Concept: Registering [Item, User]

**purpose**
Capture registered concept files with unique names so they can be downloaded or removed later, preserving authorship.

**principle**
Every registered concept has a unique name mapped to a source file URL and an author; uploads add new records, downloads read them, and removes delete them.

**state (SSF)**

```
a set of Concept with
  an id Item
  a unique_name String
  a url File
  an author Users
```

**actions**

* **upload (unique_name: String, url: File, author: Users) : (id: Item)**
  requires: unique_name is not already used
  effects: create concept with id := fresh, url := url, author := author
* **download (id: Item) : (url: File, unique_name: String, author: Users)**
  requires: concept exists for id
  effects: none (read-only)
* **remove (id: Item) : (ok: Flag)**
  requires: concept exists for id
  effects: delete that concept

---
