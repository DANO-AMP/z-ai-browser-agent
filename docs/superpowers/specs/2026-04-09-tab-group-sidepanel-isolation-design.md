# Tab Group Sidepanel Isolation

**Date:** 2026-04-09
**Status:** Draft

## Problem

When the AI agent runs a task, it may open or switch between multiple tabs. Currently the sidepanel stays open on all tabs with no visual connection between the task and its tabs. Users can accidentally interact with unrelated tabs while the agent is working.

## Design

When a task starts, create a Chrome tab group containing all tabs the agent interacts with. The sidepanel only shows on tabs within that group. Switching to a non-group tab closes the sidepanel and shows a badge hint to return.

### Lifecycle

```
1. Task starts
   → Active tab is grouped ("Z AI" tab group, purple)
   → Sidepanel opens on that tab
   → All task tab IDs tracked in a Set

2. AI opens/switches tabs during task
   → New tabs auto-join the group
   → Sidepanel stays visible (agent is driving)

3. User manually switches to non-group tab
   → Sidepanel closes (sidePanel.close)
   → Badge text: "Z AI" (hint to return)
   → Conversation state preserved in memory

4. User switches back to a group tab + clicks icon
   → Sidepanel reopens with full conversation
   → Badge stays: "AI"

5. Task ends (success, error, or user stop)
   → Tab group dissolves (chrome.tabs.ungroup)
   → Badge clears
   → Sidepanel shows final result, then closes
   → Task tab set cleared
```

### API Constraints

- `sidePanel.open()` requires a user gesture — we cannot auto-reopen when switching back
- `sidePanel.close({ windowId })` works programmatically
- `sidePanel.setOptions({ tabId, enabled })` can hard-disable per tab but is too aggressive (user can't manually open either)
- `chrome.tabs.group({ tabIds, groupId })` can add tabs to existing group
- `chrome.tabs.ungroup({ tabIds })` dissolves the group

### Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Sidepanel hide method | `sidePanel.close()` | Simple, reliable, respects Chrome UX |
| Return hint | Badge text "Z AI" | Already implemented, just keep it on |
| New tabs join group | Yes, automatically | User expects all agent tabs to be grouped |
| Task end behavior | Dissolve group | Clean slate for next task |
| Multi-window | Not supported initially | Edge case, add later if needed |

## Architecture

### Service Worker Changes

**State tracking:**
```js
let taskTabIds = new Set();      // all tabs in the task group
let taskTabGroupId = null;       // chrome tab group ID
let taskWindowId = null;         // window the task runs in
```

**`tabs.onActivated` listener:**
```
if switching to tab NOT in taskTabIds:
    sidePanel.close({ windowId: taskWindowId })
    // badge already shows "Z AI"
else if switching to tab IN taskTabIds:
    // can't auto-open, but badge is visible
    // user clicks icon → sidePanel.open({ tabId })
```

**Tool changes:**

- `tab_new`: after creating tab, call `chrome.tabs.group({ tabIds: [newTab.id], groupId: taskTabGroupId })` and add to `taskTabIds`
- `tab_switch`: if target tab not in group, add it. Switch to it.
- `navigate`: no change (same tab)

**`showTaskEffects()`:**
- Create tab group with initial tab
- Set `taskTabGroupId`, `taskWindowId`, add tab to `taskTabIds`
- Keep badge and overlay as-is

**`hideTaskEffects()`:**
- `chrome.tabs.ungroup([...taskTabIds])` — dissolve group
- Clear `taskTabIds`, `taskTabGroupId`, `taskWindowId`
- Clear badge
- Close sidepanel

**`action.onClicked`:**
- If task running AND clicked tab is in group → `sidePanel.open({ tabId })`
- If task running AND clicked tab is NOT in group → switch to last active task tab, then `sidePanel.open`
- If no task running → open sidepanel normally

### Sidepanel Changes

Minimal changes needed:
- The per-tab conversation system already works (`conversations` object keyed by tabId)
- Tab tracking via `tabs.onActivated` already loads per-tab conversations
- No new UI states needed — the sidepanel just shows/hides based on tab

### Error Handling

- If `chrome.tabs.group` fails (e.g., tab closed) → log error, continue
- If `chrome.tabs.ungroup` fails → ignore (tabs may already be closed)
- If `sidePanel.close` fails → ignore (panel may already be closed)
- If user closes a task tab manually → remove from `taskTabIds` set via `tabs.onRemoved` listener (already exists)

## Files to Modify

| File | Changes |
|------|---------|
| `background/service-worker.js` | Add `taskTabIds` set, modify `showTaskEffects`, `hideTaskEffects`, tool handlers, `tabs.onActivated` listener |
| `sidepanel/sidepanel.js` | No changes needed |
| `manifest.json` | No changes needed (`tabGroups` permission already declared) |

## Testing Checklist

- [ ] Task starts → tab group created with correct color/title
- [ ] AI opens new tab → auto-joins group
- [ ] User switches to non-group tab → sidepanel closes
- [ ] User switches back + clicks icon → sidepanel reopens with conversation
- [ ] Task ends → group dissolves, badge clears
- [ ] User stops task → same cleanup as task end
- [ ] User manually closes a task tab → removed from group, task continues
- [ ] Task with no tab switches → still grouped, still works
