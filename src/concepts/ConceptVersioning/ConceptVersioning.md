### Concept: ConceptVersioning [Item, User]

**purpose**
Track multiple versions of concepts, each with a version number, file URL, and creation timestamp, enabling version history and retrieval.

**principle**
When a concept version is uploaded with a version number and file content, it uploads the file to storage, creates a new version record with the storage URL, and stores the URL in state; later versions can be uploaded for the same concept, and any version can be downloaded (retrieving the file from storage) or retrieved by its concept and version number (or the latest if no version is specified).

**state (SSF)**
```
a set of Versions with
  a concept Concepts
  a version Number
  a fileURL String
  a created_at DateTime
```

**actions**
* **upload (concept: Concepts, version: Number, fileContent?: File, files?: Map<String, File>) : (id: Item)**
  requires: concept exists; no version with same concept and version number
  requires: either fileContent (single file) or files (multiple files) must be provided
  effects: upload file(s) to storage as a folder, get fileURL from storage, create version with id := fresh, concept := concept, version := version, fileURL := base URL for folder, created_at := now
* **download (id: Item) : (files: Map<String, File>, version: Number, created_at: DateTime)**
  requires: version exists for id
  effects: get fileURL from version, download files from storage as a folder; returns files Map containing all files in the version folder
* **remove (id: Item) : (ok: Flag)**
  requires: version exists for id
  effects: get fileURL from version, delete file from storage using fileURL, delete that version

**queries**
`_get (concept: Concepts, version?: Number) : (id: Item, fileURL: String, version: Number, created_at: DateTime)`
`_getAuthorOfVersion (version: Item) : (author: Users)`
`_download (concept: Concepts, version: Number) : (files: Map<String, File>, created_at: DateTime)`
---

