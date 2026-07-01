---
title: Hoist callbacks to the root of lists
impact: MEDIUM
impactDescription: Fewer re-renders and faster lists
tags: lists, performance, callbacks, virtualization, memoization
---

## Hoist callbacks to the root of lists

**Impact: HIGH (Fewer re-renders and faster lists)**

When passing callback functions to list items, create a single instance of the
callback at the root of the list. The callback accepts the item identifier as a
parameter, and each (memoized) item invokes it with its own id — so the parent
keeps one stable function reference instead of allocating a new closure per row.

**Incorrect (creates a new callback on each render):**

```typescript
return (
  <LegendList
    renderItem={({ item }) => {
      // bad: creates a new callback on each render
      const onPress = () => handlePress(item.id)
      return <Item key={item.id} item={item} onPress={onPress} />
    }}
  />
)
```

**Correct (a single function instance, called with each item's id):**

```typescript
const onPress = useCallback((id: string) => handlePress(id), [handlePress])

return (
  <LegendList
    renderItem={({ item }) => (
      <Item key={item.id} id={item.id} item={item} onPress={onPress} />
    )}
  />
)

// Inside the memoized Item component:
//   <Pressable onPress={() => onPress(id)}>...</Pressable>
```

Reference: [React Native FlatList performance](https://reactnative.dev/docs/optimizing-flatlist-configuration)
