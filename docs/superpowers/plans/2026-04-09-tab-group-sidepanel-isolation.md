# Tab Group Sidepanel Isolation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate the sidepanel to only show on tabs within the AI task group, closing it when the user switches away.

**Architecture:** Track all task-related tabs in a `Set`. When the user switches to a non-task tab, close the sidepanel programmatically. When AI tools open or switch tabs, auto-join them to the group. On task end, dissolve the group and clear state.

**Tech Stack:** Chrome Extension MV3, Chrome Side Panel API, Chrome Tab Groups API

**Spec:** `docs/superpowers/specs/2026-04-09-tab-group-sidepanel-isolation-design.md`

---

### Task 1: Add task tab tracking state

**Files:**
- Modify: `background/service-worker.js:98-110` (state variables section)

- [ ] **Step 1: Add `taskTabIds` and `taskWindowId` state variables**

After the existing `let taskTabGroupId = null;` (line 109), add two new variables:

```js
let taskTabGroupId = null;
let taskTabIds = new Set();       // all tabs in the current task group
let taskWindowId = null;          // window the task runs in
```

- [ ] **Step 2: Verify no syntax errors**

Load the extension in `chrome://extensions` (developer mode). Check the service worker console for errors. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: add taskTabIds and taskWindowId state variables"
```

---

### Task 2: Initialize task tab tracking in showTaskEffects

**Files:**
- Modify: `background/service-worker.js` — `showTaskEffects()` function (starts ~line 299)

- [ ] **Step 1: Add tab and window tracking to showTaskEffects**

Replace the existing `showTaskEffects` function's tab group section (lines 304-309) with:

```js
  // 2. Tab group + task tab tracking
  try {
    const groupId = await chrome.tabs.group({ tabIds: [tabId] });
    await chrome.tabGroups.update(groupId, { title: 'Z AI', color: 'purple', collapsed: false });
    taskTabGroupId = groupId;
    taskTabIds.add(tabId);
    const tab = await chrome.tabs.get(tabId);
    taskWindowId = tab.windowId;
  } catch {}
```

This initializes `taskTabIds` with the starting tab and records `taskWindowId` for later sidepanel close calls.

- [ ] **Step 2: Verify no syntax errors**

Reload extension. Check service worker console. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: initialize taskTabIds and taskWindowId in showTaskEffects"
```

---

### Task 3: Dissolve group and clear state in hideTaskEffects

**Files:**
- Modify: `background/service-worker.js` — `hideTaskEffects()` function (starts ~line 338)

- [ ] **Step 1: Replace ungroup logic to dissolve entire group**

Replace the existing ungroup section in `hideTaskEffects` (lines 342-346):

```js
  // 2. Dissolve tab group and clear tracking state
  if (taskTabIds.size > 0) {
    try {
      const tabIds = [...taskTabIds];
      await chrome.tabs.ungroup(tabIds);
    } catch {}
  }
  taskTabIds.clear();
  taskTabGroupId = null;
  taskWindowId = null;
```

This ungroups ALL task tabs (not just one), and clears all tracking state.

- [ ] **Step 2: Verify no syntax errors**

Reload extension. Check service worker console. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: dissolve full tab group and clear state in hideTaskEffects"
```

---

### Task 4: Close sidepanel on non-task tab switch

**Files:**
- Modify: `background/service-worker.js` — add new listener after `chrome.action.onClicked` (~line 166)

- [ ] **Step 1: Add tabs.onActivated listener for sidepanel isolation**

After the existing `chrome.action.onClicked` block (line 166), add:

```js
// --- TAB SWITCH: close sidepanel when leaving task tabs ---
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!running || !taskWindowId) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId !== taskWindowId) return; // different window, ignore
    if (!taskTabIds.has(tabId)) {
      // Switched to a non-task tab — close sidepanel
      chrome.sidePanel.close({ windowId: taskWindowId }).catch(() => {});
    }
  } catch {}
});
```

- [ ] **Step 2: Test manually**

1. Load extension, configure API key
2. Start a task (e.g., "Search Google for news")
3. While task runs, switch to a different tab
4. Expected: sidepanel closes, badge still shows "AI"
5. Switch back to the task tab
6. Click extension icon to reopen sidepanel
7. Expected: sidepanel opens with conversation intact

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: close sidepanel when switching to non-task tab"
```

---

### Task 5: Clean up task tabs on manual tab close

**Files:**
- Modify: `background/service-worker.js` — `tabs.onRemoved` listener (~line 169)

- [ ] **Step 1: Add taskTabIds cleanup to existing onRemoved listener**

Replace the existing `tabs.onRemoved` listener:

```js
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === debugTabId) { debugTabId = null; }
  taskTabIds.delete(tabId);  // clean up if it was a task tab
});
```

- [ ] **Step 2: Test manually**

1. Start a task that opens a new tab (e.g., "Open youtube.com")
2. While task runs, manually close the new tab
3. Expected: task continues without error, no crash

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: clean up taskTabIds when task tab is closed"
```

---

### Task 6: Auto-join new tabs to task group

**Files:**
- Modify: `background/service-worker.js` — `tab_new` tool case (~line 836)

- [ ] **Step 1: Add tab to group after creation**

Replace the `tab_new` case:

```js
      case 'tab_new': {
        const newTab = await chrome.tabs.create({ url: params.url || 'about:blank' });
        if (params.url) await sleep(2000);
        // Auto-join task group if active
        if (taskTabGroupId && running) {
          try {
            await chrome.tabs.group({ tabIds: [newTab.id], groupId: taskTabGroupId });
            taskTabIds.add(newTab.id);
          } catch {}
        }
        return { text: `Opened new tab: ${params.url || 'blank'}` };
      }
```

- [ ] **Step 2: Test manually**

1. Start a task that opens new tabs (e.g., "Search Google for 'weather', then open a new tab with youtube.com")
2. Expected: new tabs appear inside the "Z AI" tab group with purple color

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: auto-join new tabs to task group"
```

---

### Task 7: Auto-join switched tabs to task group

**Files:**
- Modify: `background/service-worker.js` — `tab_switch` tool case (~line 828)

- [ ] **Step 1: Add tab to group after switching**

Replace the `tab_switch` case:

```js
      case 'tab_switch': {
        const allT = await chrome.tabs.query({ currentWindow: true });
        const target = allT[params.index];
        if (!target) return { text: `Tab index ${params.index} not found` };
        await chrome.tabs.update(target.id, { active: true });
        // Auto-join task group if active
        if (taskTabGroupId && running && !taskTabIds.has(target.id)) {
          try {
            await chrome.tabs.group({ tabIds: [target.id], groupId: taskTabGroupId });
            taskTabIds.add(target.id);
          } catch {}
        }
        return { text: `Switched to tab ${params.index}: ${target.title}` };
      }
```

- [ ] **Step 2: Test manually**

1. Open 3-4 tabs with different sites
2. Start a task that switches tabs (e.g., "List all tabs, then switch to tab 2")
3. Expected: the target tab joins the "Z AI" group

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: auto-join switched tabs to task group"
```

---

### Task 8: Task-group-aware extension icon click

**Files:**
- Modify: `background/service-worker.js` — `chrome.action.onClicked` listener (~line 164)

- [ ] **Step 1: Replace simple open with task-aware logic**

Replace the existing `chrome.action.onClicked` listener:

```js
chrome.action.onClicked.addListener(async (tab) => {
  if (running && taskTabIds.size > 0) {
    if (taskTabIds.has(tab.id)) {
      // Clicked on a task tab — reopen sidepanel
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    } else {
      // Clicked on non-task tab while task running — switch to last task tab
      const lastTaskTabId = currentTaskTabId || [...taskTabIds][taskTabIds.size - 1];
      try {
        await chrome.tabs.update(lastTaskTabId, { active: true });
        chrome.sidePanel.open({ tabId: lastTaskTabId }).catch(() => {});
      } catch {}
    }
  } else {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
```

- [ ] **Step 2: Test manually**

1. Start a task
2. Switch to a non-task tab (sidepanel closes)
3. Click the extension icon
4. Expected: browser switches back to the task tab and sidepanel opens

5. Start a task
6. Switch to a non-task tab
7. Switch back to the task tab
8. Click the extension icon
9. Expected: sidepanel opens directly on the task tab

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: task-group-aware extension icon click behavior"
```

---

### Task 9: Full integration test

- [ ] **Step 1: End-to-end test — basic task**

1. Load extension, open a website
2. Open sidepanel, type: "Toma una captura de pantalla"
3. Expected: tab gets grouped into "Z AI" (purple), sidepanel shows task progress
4. Wait for task to complete
5. Expected: group dissolves, badge clears

- [ ] **Step 2: End-to-end test — tab switching**

1. Open 3 tabs: Google, YouTube, Wikipedia
2. Start task: "Busca 'noticias' en Google y luego abre YouTube en otra pestaña"
3. While running, switch to Wikipedia tab
4. Expected: sidepanel closes
5. Click extension icon
6. Expected: switches to task tab, sidepanel reopens
7. Let task finish
8. Expected: group dissolves, all tabs ungrouped

- [ ] **Step 3: End-to-end test — user stops task**

1. Start a long task
2. Press Escape or click Stop button
3. Expected: group dissolves, badge clears, sidepanel shows "Stopped by user"

- [ ] **Step 4: End-to-end test — manual tab close**

1. Start a task that opens a new tab
2. Manually close the new tab
3. Expected: task continues without error

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete tab group sidepanel isolation feature"
```
