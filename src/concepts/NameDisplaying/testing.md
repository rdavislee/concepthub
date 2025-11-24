[@testing-concepts](../../../design/background/testing-concepts.md)

# test: NameDisplaying
# response:

# file: src/concepts/NameDisplaying/NameDisplayingConcept.test.ts

Tests validate lifecycle (set/update/remove) and guard rails for display names.

## Principle Trace
1. change_name sets a display name for a concept (upsert).
2. change_name updates an existing display name.
3. search finds the updated name.
4. remove deletes the entry; subsequent search returns nothing.

## Actions Tested
| Action     | Requires                          | Effects                              | Verification Method            |
|------------|-----------------------------------|--------------------------------------|--------------------------------|
| change_name| display_name non-empty            | Upserts display name for concept_id  | Blank name rejection            |
| remove     | concept_id exists                 | Deletes the entry                    | Missing id removal fails        |
| search     | true                              | Reads matching entries (case-insensitive) | Partial, case-insensitive matches |

## Notes
- search returns an array of `{ conceptId, displayName }` records, consistent with query patterns.
- concept_id is used as the document `_id` to keep names unique per concept.

