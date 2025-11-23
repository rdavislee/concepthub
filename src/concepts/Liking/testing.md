[@testing-concepts](../../../design/background/testing-concepts.md)

# test: Liking
# response:

# file: src/concepts/Liking/LikingConcept.test.ts

Principle trace and action requirement/effect coverage implemented in the test file.

## Principle Trace
1. User likes an item. Like is recorded with timestamp.
2. Duplicate like attempt returns error (precondition enforced: no existing like).
3. User unlikes item; like record removed.
4. Query confirms item is no longer liked.

## Actions Tested
| Action  | Requires                               | Effects                                 | Verification Method |
|---------|-----------------------------------------|------------------------------------------|---------------------|
| like    | No existing like for (item,user)       | Insert like with at := now               | Duplicate like test |
| unlike  | Existing like for (item,user)          | Deletes that like                        | Unlike without like |

## Queries Tested
| Query     | Purpose                               | Verification |
|-----------|---------------------------------------|--------------|
| _isLiked  | Binary liked state for (item,user)    | Pre & post unlike |
| _count    | Aggregate likes for an item           | Count before/after like/unlike |

## Notes
All query methods return arrays as required. Inputs/outputs are dictionaries; IDs are opaque. No cross-concept imports.

## Additional Scenarios
- Stress test: liking many items by same user (not included yet).
- Concurrency: attempting like/unlike rapidly (future work).
