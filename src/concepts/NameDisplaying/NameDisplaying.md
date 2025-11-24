### Concept: NameDisplaying [Item, User]

**purpose**
Maintain human-friendly display names for concepts so they can be shown, updated, or cleared while remaining linked to their underlying concept identities.

**principle**
Each concept may have a single display name that can be set/changed, removed, and searched by partial match.

**state (SSF)**

```
a set of Concept with
  a concept_id Item
  a display_name String
```

**actions**

* **change_name (concept_id: Item, display_name: String) : (ok: Flag)**
  requires: display_name is non-empty
  effects: set or update display_name for concept_id
* **remove (concept_id: Item) : (ok: Flag)**
  requires: concept_id exists in the set
  effects: delete that concept's display name entry
* **search (text: String) : (concept_id: Item, display_name: String)**
  requires: true
  effects: none (read-only); returns concepts whose display_name includes text (case-insensitive)

---
