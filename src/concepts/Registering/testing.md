[@testing-concepts](../../../design/background/testing-concepts.md)

# test: Registering
# response:

# file: src/concepts/Registering/RegisteringConcept.test.ts

Lifecycle and guard rails for upload, download, and remove are exercised in the test file.

## Principle Trace
1. Upload registers a concept with unique name, URL, and author.
2. Download returns the stored metadata for a registered id.
3. Remove deletes the record; subsequent download reports an error.

## Actions Tested
| Action  | Requires                          | Effects                          | Verification Method      |
|---------|-----------------------------------|----------------------------------|--------------------------|
| upload  | unique_name not already registered | Insert new concept with fresh id | Duplicate upload rejected |
| download| Concept exists for id             | Returns url, unique_name, author | Download after upload     |
| remove  | Concept exists for id             | Deletes that concept             | Remove missing id fails   |

## Notes
- Actions return simple objects (not arrays) consistent with other concepts.
- IDs are opaque; unique names are enforced at the application level via a pre-insert check.

