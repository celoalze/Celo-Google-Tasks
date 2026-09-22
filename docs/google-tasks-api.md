# 📡 Google Tasks API v1 Integration Manual

This document provides technical reference and implementation guidelines for integrating with the official [Google Tasks API v1](https://developers.google.com/tasks/reference/rest).

---

## 📑 Table of Contents
1. [Overview & Base URL](#1-overview--base-url)
2. [Authentication & OAuth 2.0 Scopes](#2-authentication--oauth-20-scopes)
3. [API Endpoints Reference](#3-api-endpoints-reference)
4. [Data Mapping & Normalization](#4-data-mapping--normalization)
5. [Subtask Tree Reconstruction Algorithm](#5-subtask-tree-reconstruction-algorithm)
6. [Task Ordering & Position Strings](#6-task-ordering--position-strings)
7. [Cross-List Task Migration](#7-cross-list-task-migration)
8. [Rate Limits, Quotas & Error Handling](#8-rate-limits-quotas--error-handling)

---

## 1. Overview & Base URL

All requests target the Google Tasks v1 REST endpoint:
```
https://tasks.googleapis.com/tasks/v1
```

All requests must supply an `Authorization: Bearer <ACCESS_TOKEN>` header and `Content-Type: application/json`.

---

## 2. Authentication & OAuth 2.0 Scopes

### Required OAuth Scopes
To access and manage tasks, request the following scope:
* `https://www.googleapis.com/auth/tasks` (Read/write access to Tasks and TaskLists)

To retrieve user profile information:
* `https://www.googleapis.com/auth/userinfo.profile`
* `https://www.googleapis.com/auth/userinfo.email`

### Token Lifecycle
1. Access tokens expire after 3600 seconds (1 hour).
2. The Electron main process stores the `refresh_token` securely and automatically fetches a fresh `access_token` when needed.
3. If an API request returns HTTP 401, the service requests a token renewal from `window.electronAPI.getGoogleSession()` and retries the failed operation.

---

## 3. API Endpoints Reference

### 3.1 TaskLists
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/@me/lists` | Retrieves all task lists for the authenticated user. |
| `POST` | `/users/@me/lists` | Creates a new task list. Body: `{ title: string }`. |
| `PATCH`| `/users/@me/lists/{listId}` | Renames a task list. Body: `{ title: string }`. |
| `DELETE`| `/users/@me/lists/{listId}` | Deletes a task list and all tasks contained within it. |

### 3.2 Tasks
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/lists/{listId}/tasks` | Lists tasks. Query: `showCompleted=true&showHidden=true&maxResults=100`. |
| `POST` | `/lists/{listId}/tasks` | Creates a new task. Body: `{ title, notes?, due? }`. |
| `PATCH`| `/lists/{listId}/tasks/{taskId}` | Updates task fields. Body: `{ title?, notes?, due?, status? }`. |
| `DELETE`| `/lists/{listId}/tasks/{taskId}` | Permanently deletes a task. |
| `POST` | `/lists/{listId}/tasks/{taskId}/move`| Re-parents or re-orders a task. Query: `?parent={id}&previous={id}`. |
| `POST` | `/lists/{listId}/clear` | Clears all completed tasks from a list. |

---

## 4. Data Mapping & Normalization

### Task Fields
* **Status**:
  Google Tasks uses strings:
  - `'completed'` ⇄ `completed: true`
  - `'needsAction'` ⇄ `completed: false`
* **Due Date Format**:
  Google Tasks stores due dates as RFC 3339 timestamps (e.g. `2026-09-19T00:00:00.000Z`).
  - Date-only tasks in Google Tasks are normalized to midnight UTC (`00:00:00.000Z`).
* **Context Links**:
  Tasks originating from Gmail or Calendar include an array of `links`:
  ```json
  "links": [
    {
      "type": "email",
      "description": "Invoice confirmation",
      "link": "https://mail.google.com/mail/u/0/#inbox/..."
    }
  ]
  ```

---

## 5. Subtask Tree Reconstruction Algorithm

> [!IMPORTANT]
> The Google Tasks REST API returns tasks and subtasks as a single **flat array**. A subtask is identified purely by the presence of a `parent` field containing the ID of another task.

### Ingestion Logic in `GoogleTasksService.ts`:
```typescript
// 1. Separate items with parents from root tasks
const subtasksMap = new Map<string, Subtask[]>();

rawItems.forEach((item) => {
  this.taskToListMap.set(item.id, list.id);
  if (item.parent) {
    const listSubs = subtasksMap.get(item.parent) || [];
    listSubs.push({
      id: item.id,
      parentId: item.parent,
      title: item.title || '',
      completed: item.status === 'completed',
      completedAt: item.completed,
      position: item.position,
    });
    subtasksMap.set(item.parent, listSubs);
  }
});

// 2. Assemble root tasks with their populated subtasks array
const tasks: Task[] = [];
rawItems.forEach((item) => {
  if (!item.parent) {
    tasks.push({
      id: item.id,
      listId: list.id,
      title: item.title || '',
      notes: item.notes || '',
      completed: item.status === 'completed',
      due: item.due,
      subtasks: subtasksMap.get(item.id) || [],
      position: item.position,
      updatedAt: item.updated,
    });
  }
});
```

---

## 6. Task Ordering & Position Strings

Tasks use lexicographical string tokens (`position`) to represent order.

* **Reordering Tasks**:
  To position Task B after Task A:
  ```http
  POST /lists/{listId}/tasks/B/move?previous=A
  ```
* **Nesting as a Subtask**:
  To nest Task B under Task A:
  ```http
  POST /lists/{listId}/tasks/B/move?parent=A
  ```
* **Promoting a Subtask to Top-Level**:
  To turn subtask B back into a root task, call `move` without a `parent` parameter:
  ```http
  POST /lists/{listId}/tasks/B/move
  ```

---

## 7. Cross-List Task Migration

The Google Tasks API does not support a direct `move` endpoint across different task lists. To move a task from List A to List B, `GoogleTasksService` performs a 3-step atomic transaction:

1. Fetch existing task details from List A.
2. Create an identical task in target List B (`POST /lists/{targetListId}/tasks`).
   - If original was completed, patch status to `'completed'`.
3. Delete the original task from List A (`DELETE /lists/{sourceListId}/tasks/{taskId}`).
4. Update internal `taskToListMap` cache to register the new task ID under `targetListId`.

---

## 8. Rate Limits, Quotas & Error Handling

* **Daily Quota**: 50,000 queries per day per project.
* **Per-User Quota**: ~100 queries per 100 seconds per user.
* **HTTP 429 / 503**: Apply exponential backoff with jitter:
  $$T_{\text{wait}} = 2^{\text{attempt}} \times 1000\text{ms} \pm \text{jitter}$$
* **All responses wrapped in `Result<T>`**:
  Operations never throw uncaught rejections. If the network drops or the server rejects an operation, an error result is returned and state is safely rolled back in Zustand.
