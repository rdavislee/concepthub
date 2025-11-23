### Concept: Liking [Item, User]

**purpose**
Let users express a binary preference for items, preventing duplicates and enabling reversals.

**principle**
A user can like an item once; unlike removes the relation.

**state (SSF)**

```
a set of Likes with
  an item Item
  a user Users
  an at DateTime
```

**actions**

* **like (item: Item, user: Users) : (ok: Flag)**
  requires: no like exists for (item,user)
  effects: create like with at := now
* **unlike (item: Item, user: Users) : (ok: Flag)**
  requires: like exists for (item,user)
  effects: delete that like

**queries**
`_isLiked(item: Item, user: Users) : (liked: Flag)`
`_count(item: Item) : (n: Number)`

---
