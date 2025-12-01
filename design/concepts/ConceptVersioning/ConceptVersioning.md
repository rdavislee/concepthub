### Concept: ConceptVersioning [Concept]

**purpose**
Track multiple versions of concepts, each with a version number, file URL, and creation timestamp, enabling version history and retrieval.

**principle**
When a concept version is uploaded with a version number and file content, it uploads the file to storage, creates a new version record with the storage URL, and stores the URL in state; later versions can be uploaded for the same concept, and any version can be downloaded (retrieving the file from storage) or retrieved by its concept and version number (or the latest if no version is specified).

**state (SSF)**

```
a set of Version with
  a concept Concepts
  a version Number
  a fileURL String
  a created_at DateTime
```

**actions**

* **upload (concept: Concepts, version: Number, fileContent: File) : (id: Item)**
  requires: concept exists; no version with same concept and version number
  effects: upload fileContent to storage, get fileURL from storage, create version with id := fresh, concept := concept, version := version, fileURL := fileURL, created_at := now
* **download (id: Item) : (fileContent: File, version: Number, created_at: DateTime)**
  requires: version exists for id
  effects: get fileURL from version, download fileContent from storage using fileURL
* **remove (id: Item) : (ok: Flag)**
  requires: version exists for id
  effects: get fileURL from version, delete file from storage using fileURL, delete that version

**queries**

* **_get (concept: Concepts, version: Number) : (id: Item, fileURL: String, version: Number, created_at: DateTime)**
  requires: version exists for concept and version number
  effects: returns version with specified concept and version number
* **_get (concept: Concepts) : (id: Item, fileURL: String, version: Number, created_at: DateTime)**
  requires: at least one version exists for concept
  effects: returns the latest version for the concept (highest version number, or most recent created_at if versions are equal)

---
