### Concept: DownloadAnalyzing [Item, User]

**purpose**
Record that a user downloaded an item, enabling analytics and rate/abuse insights (analysis via queries/consumers).

**principle**
When a download occurs it is recorded with time and identities; later, aggregates are computed via queries; records are append-only.

**state (SSF)**

```
a set of Downloads with
  a item Item
  a user Users
  a at DateTime
```

**actions**

* **record (item: Item, user: Users, at: DateTime) : (download: Downloads)**
  requires: true
  effects: create download record

**queries**
`_countForItem(item: Item, from: DateTime, to: DateTime) : (count: Number)`
`_recentForUser(user: Users) : (download: Downloads)`

---
