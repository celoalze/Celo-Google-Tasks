import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTaskStore, SortOption } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import { TaskCard } from './TaskCard';
import { Task } from '../../contracts/tasks.types';
import {
  TasksDoneIllustration,
  EmptyTasksIllustration,
  NothingStarredIllustration,
} from '../illustrations';
import { GoogleTasksAddIcon } from '../ui/icons/GoogleTasksAddIcon';
import { M3Button } from '../ui/M3Button';
import { M3IconButton } from '../ui/M3IconButton';
import { M3Dialog } from '../ui/M3Dialog';
import { M3TextField } from '../ui/M3TextField';
import { M3Menu, M3MenuItem, M3MenuDivider, M3MenuHeader } from '../ui/M3Menu';

interface ListCardColumnProps {
  listId: string;
  listTitle: string;
  tasks: Task[];
  isDefaultList?: boolean;
  isSmartFilter?: boolean;
  isCardDraggable?: boolean;
  onCardDragStart?: (listId: string) => void;
  onCardDragOver?: (listId: string) => void;
  onCardDragLeave?: (listId: string) => void;
  onCardDrop?: (sourceListId: string, targetListId: string) => void;
  onCardDragEnd?: () => void;
  isCardDropTarget?: boolean;
  isCardDragged?: boolean;
}

const sortTasks = (taskList: Task[], sort: SortOption, locale: string): Task[] => {
  const copy = [...taskList];
  switch (sort) {
    case 'date':
    case 'deadline':
      return copy.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      });
    case 'starred':
      return copy.sort((a, b) => {
        if (a.starred === b.starred) return 0;
        return a.starred ? -1 : 1;
      });
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title, locale));
    case 'my_order':
    default:
      return copy.sort((a, b) => {
        if (a.position && b.position) {
          return a.position.localeCompare(b.position);
        }
        return 0;
      });
  }
};

const ListCardColumnComponent: React.FC<ListCardColumnProps> = ({
  listId,
  listTitle,
  tasks,
  isDefaultList = false,
  isSmartFilter = false,
  isCardDraggable = false,
  onCardDragStart,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  onCardDragEnd,
  isCardDropTarget = false,
  isCardDragged = false,
}) => {
  const currentSort = useTaskStore((state) => state.listSort[listId] || 'my_order');
  const searchQuery = useTaskStore((state) => state.searchQuery);
  const draggedTaskId = useTaskStore((state) => state.draggedTaskId);
  const setListSort = useTaskStore((state) => state.setListSort);
  const openCreateTaskModal = useTaskStore((state) => state.openCreateTaskModal);
  const renameList = useTaskStore((state) => state.renameList);
  const deleteList = useTaskStore((state) => state.deleteList);
  const clearCompletedTasks = useTaskStore((state) => state.clearCompletedTasks);
  const reorderTask = useTaskStore((state) => state.reorderTask);
  const setSelectedTaskId = useTaskStore((state) => state.setSelectedTaskId);
  const setDraggedTaskId = useTaskStore((state) => state.setDraggedTaskId);

  const t = useI18nStore((state) => state.t);
  const locale = useI18nStore((state) => state.locale);

  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameInput, setRenameInput] = useState(listTitle);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Drag and Drop state for task reordering
  const [dropTarget, setDropTarget] = useState<{ taskId: string; position: 'above' | 'below' } | null>(null);
  const [isColumnDropTarget, setIsColumnDropTarget] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const sortedActiveTasks = useMemo(
    () => sortTasks(activeTasks, currentSort, locale),
    [activeTasks, currentSort, locale]
  );

  const handleSortSelect = (sort: SortOption) => {
    setListSort(listId, sort);
    setIsMenuOpen(false);
  };

  const handleOpenRename = () => {
    setRenameInput(listTitle);
    setIsRenameDialogOpen(true);
    setIsMenuOpen(false);
  };

  const handleSaveRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renameInput.trim()) {
      await renameList(listId, renameInput.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleDeleteList = async () => {
    await deleteList(listId);
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteAllCompleted = async () => {
    setIsMenuOpen(false);
    await clearCompletedTasks(listId);
  };

  // Drag and drop handlers for tasks within list
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/task-id', taskId);
      e.dataTransfer.setData('text/plain', taskId);
    } catch {}
    setDraggedTaskId(taskId);
  }, [setDraggedTaskId]);

  const handleDragOver = useCallback((e: React.DragEvent, taskId: string) => {
    if (!draggedTaskId || draggedTaskId === taskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: 'above' | 'below' = e.clientY < midY ? 'above' : 'below';

    if (!dropTarget || dropTarget.taskId !== taskId || dropTarget.position !== position) {
      setDropTarget({ taskId, position });
    }
  }, [draggedTaskId, dropTarget]);

  const handleDragLeave = useCallback((e: React.DragEvent, taskId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dropTarget?.taskId === taskId) {
        setDropTarget(null);
      }
    }
  }, [dropTarget]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceTaskId =
      e.dataTransfer.getData('text/task-id') ||
      e.dataTransfer.getData('text/plain') ||
      draggedTaskId;

    const currentDropPos = dropTarget?.position || 'below';
    setDraggedTaskId(null);
    setDropTarget(null);
    setIsColumnDropTarget(false);

    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const targetIdx = sortedActiveTasks.findIndex((t) => t.id === targetTaskId);
    if (targetIdx === -1) return;

    let targetPreviousTaskId: string | null = null;
    if (currentDropPos === 'above') {
      // Place above targetTaskId: previous is item before targetTaskId
      if (targetIdx > 0) {
        const itemBefore = sortedActiveTasks[targetIdx - 1];
        if (itemBefore.id === sourceTaskId) return; // already in this position
        targetPreviousTaskId = itemBefore.id;
      } else {
        // Place at very top of list
        targetPreviousTaskId = null;
      }
    } else {
      // Place below targetTaskId: previous is targetTaskId itself
      const itemAfter = sortedActiveTasks[targetIdx + 1];
      if (itemAfter && itemAfter.id === sourceTaskId) return; // already in this position
      targetPreviousTaskId = targetTaskId;
    }

    await reorderTask(sourceTaskId, targetPreviousTaskId, isSmartFilter ? undefined : listId);
  }, [draggedTaskId, dropTarget, sortedActiveTasks, reorderTask, isSmartFilter, listId, setDraggedTaskId]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDropTarget(null);
    setIsColumnDropTarget(false);
  }, [setDraggedTaskId]);

  const sortMenuOptions: Array<{ key: SortOption; label: string }> = [
    { key: 'my_order', label: t('lists.sortMyOrder') },
    { key: 'date', label: t('lists.sortDate') },
    { key: 'deadline', label: t('lists.sortDeadline') },
    { key: 'starred', label: t('lists.sortStarred') },
    { key: 'title', label: t('lists.sortTitle') },
  ];

  const isDraggableMode = !isSmartFilter && currentSort === 'my_order' && !searchQuery;

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/list-id')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onCardDragOver?.(listId);
        } else if (draggedTaskId && !isSmartFilter) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!isColumnDropTarget) setIsColumnDropTarget(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.dataTransfer.types.includes('text/list-id')) {
          onCardDragLeave?.(listId);
        }
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsColumnDropTarget(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('text/list-id')) {
          e.preventDefault();
          const sourceId = e.dataTransfer.getData('text/list-id');
          if (sourceId && sourceId !== listId) {
            onCardDrop?.(sourceId, listId);
          }
        } else if (draggedTaskId && !isSmartFilter) {
          e.preventDefault();
          const sourceTaskId =
            e.dataTransfer.getData('text/task-id') ||
            e.dataTransfer.getData('text/plain') ||
            draggedTaskId;

          setIsColumnDropTarget(false);
          setDraggedTaskId(null);
          setDropTarget(null);

          if (sourceTaskId) {
            const lastTask = sortedActiveTasks[sortedActiveTasks.length - 1];
            reorderTask(sourceTaskId, lastTask ? lastTask.id : null, listId);
          }
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedTaskId(null);
        }
      }}
      className={`group/card bg-m3-surface-container rounded-[16px] p-4 pt-3 flex flex-col w-full shadow-sm select-none transition-all duration-150 ${
        isCardDropTarget
          ? 'ring-2 ring-m3-primary bg-m3-surface-container-high'
          : isColumnDropTarget
          ? 'ring-2 ring-m3-primary/70 bg-m3-surface-container-high shadow-md'
          : ''
      } ${isCardDragged ? 'opacity-40 scale-[0.99]' : ''}`}
    >
      {/* Top Drag Handle (Pill) - Only shown on card hover */}
      {!isSmartFilter && (
        <div
          draggable={isCardDraggable}
          onDragStart={(e) => {
            if (!isCardDraggable) return;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/list-id', listId);
            onCardDragStart?.(listId);
          }}
          onDragEnd={() => onCardDragEnd?.()}
          title={isCardDraggable ? 'Arrastar para reordenar o cartão' : undefined}
          className={`w-full flex items-center justify-center pb-2.5 -mt-0.5 transition-opacity duration-150 ${
            isCardDragged ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
          } ${isCardDraggable ? 'cursor-grab active:cursor-grabbing group/drag' : ''}`}
        >
          <div
            className={`w-9 h-[3.5px] rounded-full transition-colors ${
              isCardDraggable
                ? 'bg-m3-outline-variant group-hover/drag:bg-m3-outline'
                : 'bg-m3-outline-variant/60'
            }`}
          />
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 flex-shrink-0">
        <h2 className="text-base font-normal text-m3-on-surface tracking-tight truncate pl-1">
          {listTitle}
        </h2>

        {/* Three Dots Menu Button */}
        <div className="relative" ref={menuRef}>
          <M3IconButton
            icon="more_vert"
            size="md"
            title={t('lists.listOptions')}
            active={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          />

          {/* Dropdown Menu directly mirroring Google Tasks Web screenshot */}
          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-30">
              <M3Menu width="w-64">
                <M3MenuHeader title={t('lists.sortBy')} />

                {sortMenuOptions.map((opt) => (
                  <M3MenuItem
                    key={opt.key}
                    label={opt.label}
                    selected={currentSort === opt.key}
                    indent={true}
                    onClick={() => handleSortSelect(opt.key)}
                  />
                ))}

                {!isSmartFilter && (
                  <>
                    <M3MenuDivider />
                    <M3MenuItem
                      label={t('lists.renameList')}
                      onClick={handleOpenRename}
                    />

                    <M3MenuItem
                      label={t('lists.deleteList')}
                      sublabel={isDefaultList ? t('lists.cannotDeleteDefaultList') : undefined}
                      disabled={isDefaultList}
                      onClick={() => {
                        if (isDefaultList) return;
                        setIsMenuOpen(false);
                        setIsDeleteDialogOpen(true);
                      }}
                    />
                  </>
                )}

                <M3MenuDivider />

                {/* Imprimir lista */}
                <M3MenuItem
                  label={t('lists.printList')}
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.print();
                  }}
                />

                {/* Excluir todas as tarefas concluídas */}
                <M3MenuItem
                  label={t('lists.clearCompletedTasks')}
                  disabled={completedTasks.length === 0}
                  onClick={handleDeleteAllCompleted}
                />

                {/* Marcar as tarefas antigas como concluídas */}
                <M3MenuItem
                  label={t('lists.markOldCompleted')}
                  disabled={true}
                  onClick={() => {}}
                />
              </M3Menu>
            </div>
          )}
        </div>
      </div>

      {/* Inline "+ Adicionar uma tarefa" Button */}
      <div className="pt-0.5 pb-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => openCreateTaskModal(isSmartFilter ? undefined : listId)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-m3-primary hover:bg-m3-surface active:bg-m3-surface-dim transition-colors focus:outline-none select-none"
        >
          <GoogleTasksAddIcon size={18} className="text-m3-primary" />
          <span>{t('lists.addTask')}</span>
        </button>
      </div>

      {/* Active Tasks List */}
      <div className="space-y-1">
        {sortedActiveTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isDraggable={isDraggableMode}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dropIndicator={dropTarget?.taskId === task.id ? dropTarget.position : null}
          />
        ))}
      </div>

      {/* Empty State - Official Google Tasks Artwork */}
      {sortedActiveTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center select-none">
          {completedTasks.length > 0 ? (
            <>
              <TasksDoneIllustration className="w-28 h-28 mb-1" />
              <p className="text-sm font-medium text-m3-on-surface">{t('lists.allTasksCompleted')}</p>
              <p className="text-xs text-m3-outline mt-1">{t('lists.goodJob')}</p>
            </>
          ) : isSmartFilter && listId === 'starred' ? (
            <>
              <NothingStarredIllustration className="w-32 h-32 mb-1" />
              <p className="text-sm font-medium text-m3-on-surface">{t('lists.noStarredTasks')}</p>
              <p className="text-xs text-m3-outline mt-1 max-w-[240px]">{t('lists.noStarredTasksDesc')}</p>
            </>
          ) : (
            <>
              <EmptyTasksIllustration className="w-28 h-28 mb-1" />
              <p className="text-sm font-medium text-m3-on-surface">{t('lists.noTasksYet')}</p>
              <p className="text-xs text-m3-outline mt-1">{t('lists.addTaskPrompt')}</p>
            </>
          )}
        </div>
      )}

      {/* Completed Tasks Collapsible Section */}
      {completedTasks.length > 0 && (
        <div className="mt-4 pt-1">
          <button
            type="button"
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-m3-outline hover:text-m3-on-surface transition-colors rounded-lg hover:bg-m3-on-surface/[0.06]"
          >
            <span
              className={`material-symbols-rounded text-[16px] transition-transform duration-150 ${
                isCompletedExpanded ? 'rotate-0' : '-rotate-90'
              }`}
            >
              keyboard_arrow_down
            </span>
            <span>
              {t('lists.completedHeader', { count: completedTasks.length })}
            </span>
          </button>

          {isCompletedExpanded && (
            <div className="mt-1 space-y-1">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Renomear lista */}
      <M3Dialog
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        title={t('lists.renameDialogTitle')}
        actions={
          <>
            <M3Button variant="text" onClick={() => setIsRenameDialogOpen(false)}>
              {t('common.cancel')}
            </M3Button>
            <M3Button
              variant="text"
              disabled={!renameInput.trim()}
              onClick={() => handleSaveRename()}
            >
              {t('common.save')}
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSaveRename}>
          <M3TextField
            autoFocus
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            placeholder={t('taskModal.titlePlaceholder')}
          />
        </form>
      </M3Dialog>

      {/* Modal: Excluir lista */}
      <M3Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title={t('lists.deleteDialogTitle')}
        description={t('lists.deleteDialogDesc')}
        actions={
          <>
            <M3Button variant="text" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </M3Button>
            <M3Button variant="danger" onClick={handleDeleteList}>
              {t('lists.deleteDialogConfirm')}
            </M3Button>
          </>
        }
      />
    </div>
  );
};

export const ListCardColumn = React.memo(ListCardColumnComponent);
