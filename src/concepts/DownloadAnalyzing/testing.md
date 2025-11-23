[@testing-concepts](../../../design/background/testing-concepts.md)

# test: DownloadAnalyzing
# response:

# file: src/concepts/DownloadAnalyzing/DownloadAnalyzingConcept.test.ts

## Principle Trace
1. A download is recorded with item, user, timestamp.
2. Multiple downloads accumulate for analytics.
3. A time-bounded count query returns aggregate number.
4. Recent downloads per user are listed in descending order.

## Actions Tested
| Action | Requires        | Effects                | Verification |
|--------|-----------------|------------------------|--------------|
| record | true (fields present) | Insert download doc | Missing field error; presence count |

## Queries Tested
| Query           | Purpose                                      | Verification |
|-----------------|----------------------------------------------|--------------|
| _countForItem   | Count downloads in time range for an item    | Window w/ downloads & empty window |
| _recentForUser  | Retrieve recent downloads for a user         | Length matches limit and ordering (implicit) |

## Notes
Append-only behavior respected (no delete action). Arrays returned per query. Independent from other concepts.

## Additional Scenarios
- Abuse detection windows (future test: rapid downloads).\
- Large time range performance test (future).
