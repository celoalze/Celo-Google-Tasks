/**
 * Domain contracts and schemas strictly aligned with the official Google Tasks API v1.
 */

export interface Subtask {
  readonly id: string;
  readonly parentId: string;
  readonly title: string;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly position?: string;
}

export interface TaskLink {
  readonly type: string; // e.g. 'email'
  readonly description?: string;
  readonly link: string;
}

export interface TaskAssignmentInfo {
  readonly driveResourceInfo?: {
    readonly driveFileId?: string;
    readonly resourceTitle?: string;
  };
  readonly spaceInfo?: {
    readonly space?: string;
  };
  readonly linkToTask?: string;
}

export interface Task {
  readonly id: string;
  readonly listId: string;
  readonly title: string;
  readonly notes?: string;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly due?: string; // RFC 3339 timestamp (e.g. 2026-09-18T21:00:00.000Z)
  readonly time?: string; // e.g. "19:00"
  readonly isAllDay?: boolean;
  readonly recurrence?: string;
  readonly starred?: boolean;
  readonly subtasks: readonly Subtask[];
  readonly position?: string;
  readonly updatedAt?: string;
  readonly links?: readonly TaskLink[];
  readonly assignmentInfo?: TaskAssignmentInfo;
  readonly webViewLink?: string;
}

export interface TaskList {
  readonly id: string;
  readonly title: string;
  readonly updated?: string;
  readonly taskCount?: number;
  readonly icon?: string;
  readonly isDefault?: boolean;
}

export type SmartFilterType =
  | 'all'
  | 'starred'
  | 'today'
  | 'tomorrow'
  | 'overdue'
  | 'completed';

export interface SmartFilterDefinition {
  readonly id: SmartFilterType;
  readonly title: string;
  readonly icon: string;
}

export interface TaskGroup {
  readonly id: string;
  readonly title: string;
  readonly tasks: readonly Task[];
  readonly icon?: string;
}

export interface UserProfile {
  readonly displayName: string;
  readonly email: string;
  readonly photoUrl?: string;
  readonly isAuthenticated: boolean;
}
