import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../contracts/tasks.types';
import { formatGoogleTaskBadge, isOverdue, formatCompletedAt } from '../../core/dateUtils';
import { useTaskStore } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import { M3Checkbox } from '../ui/M3Checkbox';
import { TaskContextMenu } from './TaskContextMenu';

interface TaskCardProps {
  task: Task;
  showListName?: boolean;
  listTitle?: string;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent, taskId: string) => void;
  onDragLeave?: (e: React.DragEvent, taskId: string) => void;
  onDrop?: (e: React.DragEvent, taskId: string) => void;
  onDragEnd?: () => void;
  dropIndicator?: 'above' | 'below' | null;
}

const TaskCardComponent: React.FC<TaskCardProps> = ({
  task,
  showListName = false,
  listTitle,
  isDraggable = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  dropIndicator = null,
}) => {
  const isExpanded = useTaskStore((state) => state.selectedTaskId === task.id);
  const setSelectedTaskId = useTaskStore((state) => state.setSelectedTaskId);
  const openEditTaskModal = useTaskStore((state) => state.openEditTaskModal);
  const toggleTaskCompletion = useTaskStore((state) => state.toggleTaskCompletion);
  const toggleTaskStar = useTaskStore((state) => state.toggleTaskStar);
  const toggleSubtaskCompletion = useTaskStore((state) => state.toggleSubtaskCompletion);
  const updateTask = useTaskStore((state) => state.updateTask);

  const t = useI18nStore((state) => state.t);
  const locale = useI18nStore((state) => state.locale);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [localTitle, setLocalTitle] = useState(task.title);
  const [shouldFocusTitle, setShouldFocusTitle] = useState(false);
  const [localNotes, setLocalNotes] = useState(task.notes || '');
  const [isAddingNotes, setIsAddingNotes] = useState(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setLocalNotes(task.notes || '');
  }, [task.notes]);

  useEffect(() => {
    if (isAddingNotes && notesTextareaRef.current) {
      notesTextareaRef.current.focus();
    }
  }, [isAddingNotes]);

  useEffect(() => {
    if (isExpanded && shouldFocusTitle && titleTextareaRef.current) {
      titleTextareaRef.current.focus();
      setShouldFocusTitle(false);
    }
  }, [isExpanded, shouldFocusTitle]);

  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [localTitle, isExpanded]);

  useEffect(() => {
    if (notesTextareaRef.current) {
      notesTextareaRef.current.style.height = 'auto';
      notesTextareaRef.current.style.height = `${notesTextareaRef.current.scrollHeight}px`;
    }
  }, [localNotes, isExpanded, isAddingNotes]);

  const handleSaveTitle = () => {
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    } else if (!trimmed) {
      setLocalTitle(task.title);
    }
  };

  const handleSaveNotes = () => {
    const trimmed = localNotes.trim();
    if (trimmed !== (task.notes || '').trim()) {
      updateTask(task.id, { notes: trimmed });
    }
    if (!trimmed) {
      setIsAddingNotes(false);
    }
  };

  const formattedDue = formatGoogleTaskBadge(task.due, locale);
  const overdue = !task.completed && isOverdue(task.due);

  const completedSubtasksCount = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasksCount = task.subtasks.length;

  const handleCardClick = () => {
    // If context menu is open, let click dismiss it
    if (contextMenuPos) {
      setContextMenuPos(null);
      return;
    }
    // Toggle in-place expansion
    setSelectedTaskId(isExpanded ? null : task.id);
  };

  const handleCardDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditTaskModal(task);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleMoreButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPos({ x: rect.left, y: rect.bottom + 4 });
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleTaskStar(task.id);
  };

  return (
    <>
      <div
        draggable={isDraggable && isExpanded}
        onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
        onDragOver={(e) => onDragOver && onDragOver(e, task.id)}
        onDragLeave={(e) => onDragLeave && onDragLeave(e, task.id)}
        onDrop={(e) => onDrop && onDrop(e, task.id)}
        onDragEnd={onDragEnd}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        onContextMenu={handleContextMenu}
        className={`group relative flex flex-col px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer select-none ${
          isExpanded
            ? 'bg-m3-surface-container-high ring-1 ring-m3-outline-variant/30 shadow-sm'
            : 'bg-transparent hover:bg-m3-on-surface/[0.06] active:bg-m3-on-surface/[0.1]'
        } ${
          dropIndicator === 'above'
            ? 'border-t-2 border-m3-primary !rounded-t-none bg-m3-primary/5'
            : dropIndicator === 'below'
            ? 'border-b-2 border-m3-primary !rounded-b-none bg-m3-primary/5'
            : ''
        }`}
      >
        {/* Six-Dot Drag Handle: Strictly visible ONLY when expanded and draggable */}
        {isDraggable && isExpanded && (
          <div
            draggable
            onDragStart={(e) => {
              onDragStart && onDragStart(e, task.id);
            }}
            onClick={(e) => e.stopPropagation()}
            title={t('taskCard.dragToReorder')}
            className="absolute -left-6 top-1/2 -translate-y-1/2 text-m3-outline/70 hover:text-m3-on-surface cursor-grab active:cursor-grabbing p-1 flex items-center justify-center transition-colors z-10 select-none"
          >
            <span className="material-symbols-rounded text-[18px]">drag_indicator</span>
          </div>
        )}

        {/* Main Row: Checkbox, Title & Action Buttons */}
        <div className="flex items-start gap-2.5 w-full">
          {/* Checkbox */}
          <div
            className="pt-0.5 flex-shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskCompletion(task.id);
            }}
          >
            <M3Checkbox
              checked={task.completed}
              onChange={() => toggleTaskCompletion(task.id)}
            />
          </div>

          {/* Title & Notes */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {isExpanded ? (
              <textarea
                ref={titleTextareaRef}
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    titleTextareaRef.current?.blur();
                  } else if (e.key === 'Escape') {
                    setLocalTitle(task.title);
                    titleTextareaRef.current?.blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                rows={1}
                className={`w-full bg-transparent text-sm leading-snug p-0 m-0 border-0 focus:outline-none focus:ring-0 resize-none transition-colors select-text cursor-text ${
                  task.completed ? 'line-through text-m3-outline' : 'text-m3-on-surface'
                }`}
              />
            ) : (
              <span
                onClick={() => setShouldFocusTitle(true)}
                className={`text-sm leading-snug transition-colors break-words ${
                  task.completed
                    ? 'line-through text-m3-outline'
                    : 'text-m3-on-surface'
                }`}
              >
                {task.title}
              </span>
            )}

            {/* Notes: Editable inline when expanded, or static preview when collapsed */}
            {isExpanded ? (
              task.notes || isAddingNotes ? (
                <div
                  className="mt-1 w-full"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={notesTextareaRef}
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        notesTextareaRef.current?.blur();
                      }
                    }}
                    placeholder={t('taskCard.details') || 'Detalhes'}
                    rows={Math.max(1, localNotes.split('\n').length)}
                    className="w-full bg-transparent text-xs text-m3-on-surface placeholder:text-m3-outline focus:outline-none resize-none leading-relaxed transition-colors select-text cursor-text"
                  />
                </div>
              ) : (
                <div
                  className="mt-1"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingNotes(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-m3-outline hover:text-m3-on-surface py-0.5 transition-colors select-none group/details"
                  >
                    <span className="material-symbols-rounded text-[16px] text-m3-outline group-hover/details:text-m3-on-surface">
                      notes
                    </span>
                    <span>{t('taskCard.details') || 'Detalhes'}</span>
                  </button>
                </div>
              )
            ) : (
              task.notes && (
                <p className="text-xs text-m3-on-surface-variant/80 mt-0.5 break-words line-clamp-2">
                  {task.notes}
                </p>
              )
            )}

            {/* Completed At date line if completed */}
            {task.completed && (
              <span className="text-[11px] text-m3-outline mt-0.5">
                {formatCompletedAt(task.completedAt, task.updatedAt, locale)}
              </span>
            )}
          </div>

          {/* Right Actions: 3-Dots Button & Star Button */}
          <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5 -mr-1">
            {/* 3-Dots More Options Button ("Opções do app Tarefas") */}
            <button
              type="button"
              onClick={handleMoreButtonClick}
              title={t('taskCard.taskOptions')}
              className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant hover:text-m3-on-surface transition-all duration-150 focus:outline-none ${
                isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <span className="material-symbols-rounded text-[18px]">more_vert</span>
            </button>

            {/* Star Favorite Button */}
            <button
              type="button"
              onClick={handleStarClick}
              title={task.starred ? t('taskCard.unstarTask') : t('taskCard.starTask')}
              className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 transition-all duration-150 focus:outline-none ${
                task.starred
                  ? 'opacity-100'
                  : isExpanded
                  ? 'opacity-0 group-hover:opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <span
                className={`material-symbols-rounded text-[18px] transition-all duration-150 ${
                  task.starred
                    ? 'text-m3-star'
                    : 'text-m3-outline/60 hover:text-m3-on-surface'
                }`}
                style={{
                  fontVariationSettings: task.starred ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                star
              </span>
            </button>
          </div>
        </div>

        {/* Metadata sub-row (Chips: Due Date, Subtasks, Links, Workspace Badges) */}
        {((formattedDue && !task.completed) ||
          (!isExpanded && totalSubtasksCount > 0) ||
          (showListName && listTitle) ||
          (task.links && task.links.length > 0) ||
          task.assignmentInfo) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-7 text-xs">
            {/* Active Due Date Badge */}
            {!task.completed && formattedDue && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openEditTaskModal(task);
                }}
                title={t('taskModal.setDueDateTitle')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition-colors ${
                  overdue
                    ? 'text-m3-error bg-m3-error/15 border-m3-error/30 hover:bg-m3-error/20'
                    : 'text-m3-primary bg-transparent border-m3-outline-variant/40 hover:bg-m3-primary/10 hover:border-m3-outline-variant/70'
                }`}
              >
                <span className="material-symbols-rounded text-[13px]">schedule</span>
                <span>{formattedDue}</span>
              </span>
            )}

            {/* Subtasks Count Badge (when not expanded) */}
            {!isExpanded && totalSubtasksCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-m3-on-surface-variant/80">
                <span className="material-symbols-rounded text-[14px]">checklist</span>
                <span>
                  {completedSubtasksCount > 0
                    ? `${completedSubtasksCount}/${totalSubtasksCount}`
                    : locale === 'en'
                    ? `${totalSubtasksCount} subtask${totalSubtasksCount > 1 ? 's' : ''}`
                    : locale === 'es'
                    ? `${totalSubtasksCount} subtarea${totalSubtasksCount > 1 ? 's' : ''}`
                    : `${totalSubtasksCount} subtarefa${totalSubtasksCount > 1 ? 's' : ''}`}
                </span>
              </span>
            )}

            {/* Gmail Link Chips */}
            {task.links &&
              task.links.map((link, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.electronAPI?.openExternal(link.link);
                  }}
                  title={`Abrir e-mail no Gmail: ${link.description || link.link}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-m3-error/15 hover:bg-m3-error/25 text-m3-error transition-colors"
                >
                  <span className="material-symbols-rounded text-[13px]">mail</span>
                  <span className="truncate max-w-[140px]">
                    {link.description || 'E-mail do Gmail'}
                  </span>
                  <span className="material-symbols-rounded text-[11px] opacity-70">
                    open_in_new
                  </span>
                </button>
              ))}

            {/* Google Workspace Assignment Badges */}
            {task.assignmentInfo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.assignmentInfo?.linkToTask) {
                    window.electronAPI?.openExternal(task.assignmentInfo.linkToTask);
                  }
                }}
                title="Origem no Google Workspace"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-m3-surface-container-highest hover:bg-m3-surface-bright text-m3-primary transition-colors"
              >
                <span className="material-symbols-rounded text-[13px]">
                  {task.assignmentInfo.driveResourceInfo ? 'description' : 'forum'}
                </span>
                <span className="truncate max-w-[140px]">
                  {task.assignmentInfo.driveResourceInfo?.resourceTitle ||
                    task.assignmentInfo.spaceInfo?.space ||
                    'Google Docs'}
                </span>
                {task.assignmentInfo.linkToTask && (
                  <span className="material-symbols-rounded text-[11px] opacity-70">
                    open_in_new
                  </span>
                )}
              </button>
            )}

            {/* List name badge if in multi-list view */}
            {showListName && listTitle && (
              <span className="text-[11px] bg-m3-surface-container-highest px-2 py-0.5 rounded-full text-m3-on-surface-variant">
                {listTitle}
              </span>
            )}
          </div>
        )}

        {/* Interactive Subtasks List when expanded */}
        {isExpanded && totalSubtasksCount > 0 && (
          <div className="mt-2.5 pt-2 border-t border-m3-outline-variant/20 pl-7 space-y-1.5">
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 text-xs py-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <M3Checkbox
                  checked={subtask.completed}
                  onChange={() => toggleSubtaskCompletion(task.id, subtask.id)}
                />
                <span
                  className={`truncate flex-1 ${
                    subtask.completed
                      ? 'line-through text-m3-outline'
                      : 'text-m3-on-surface'
                  }`}
                >
                  {subtask.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Task Options Menu (Opções do app Tarefas) */}
      {contextMenuPos && (
        <TaskContextMenu
          task={task}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </>
  );
};

export const TaskCard = React.memo(TaskCardComponent);
