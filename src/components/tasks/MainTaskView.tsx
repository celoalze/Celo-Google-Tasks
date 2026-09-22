import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import { ListCardColumn } from './ListCardColumn';
import { Task } from '../../contracts/tasks.types';
import { AllListsHiddenIllustration } from '../illustrations';

export const MainTaskView: React.FC = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const lists = useTaskStore((state) => state.lists);
  const activeFilter = useTaskStore((state) => state.activeFilter);
  const visibleListIds = useTaskStore((state) => state.visibleListIds);
  const searchQuery = useTaskStore((state) => state.searchQuery);
  const setAllListsVisible = useTaskStore((state) => state.setAllListsVisible);
  const reorderList = useTaskStore((state) => state.reorderList);

  const t = useI18nStore((state) => state.t);

  const [draggedCardListId, setDraggedCardListId] = useState<string | null>(null);
  const [dropTargetCardListId, setDropTargetCardListId] = useState<string | null>(null);

  // Responsive column count listener (capped at max 3 columns as requested)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1400
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getResponsiveColumnCount = () => {
    if (windowWidth < 860) return 1;
    if (windowWidth < 1300) return 2;
    return 3; // Maximum of 3 blocks per row
  };

  const responsiveCols = getResponsiveColumnCount();

  // Card Drag and Drop handlers
  const handleCardDragStart = useCallback((listId: string) => {
    setDraggedCardListId(listId);
  }, []);

  const handleCardDragOver = useCallback((listId: string) => {
    setDropTargetCardListId((current) => {
      if (draggedCardListId && draggedCardListId !== listId && current !== listId) {
        return listId;
      }
      return current;
    });
  }, [draggedCardListId]);

  const handleCardDragLeave = useCallback((listId: string) => {
    setDropTargetCardListId((current) => (current === listId ? null : current));
  }, []);

  const handleCardDrop = useCallback((sourceListId: string, targetListId: string) => {
    if (sourceListId && targetListId && sourceListId !== targetListId) {
      reorderList(sourceListId, targetListId);
    }
    setDraggedCardListId(null);
    setDropTargetCardListId(null);
  }, [reorderList]);

  const handleCardDragEnd = useCallback(() => {
    setDraggedCardListId(null);
    setDropTargetCardListId(null);
  }, []);

  // Filter tasks by active search query if present, memoized to prevent recreating task arrays
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  // Group filtered tasks by listId for O(1) retrieval instead of repeated O(N) array filtering
  const tasksByListId = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      if (!map[t.listId]) map[t.listId] = [];
      map[t.listId].push(t);
    }
    return map;
  }, [filteredTasks]);

  // "Todas as tarefas" Masonry Grid / Multi-List Board View (Max 3 Columns)
  // MUST be called unconditionally before any early returns to obey React Rules of Hooks
  const displayLists = useMemo(
    () => lists.filter((l) => visibleListIds.includes(l.id)),
    [lists, visibleListIds]
  );
  const numCols = Math.min(responsiveCols, Math.max(1, displayLists.length));

  // Distribute lists into masonry column arrays
  const columnLists = useMemo(() => {
    const cols: (typeof displayLists)[] = Array.from({ length: numCols }, () => []);
    displayLists.forEach((list, idx) => {
      cols[idx % numCols].push(list);
    });
    return cols;
  }, [displayLists, numCols]);

  // 1. Starred Smart Filter View
  if (activeFilter === 'starred') {
    const starredTasks = filteredTasks.filter((t) => t.starred);
    return (
      <main className="flex-1 h-full min-w-0 overflow-y-auto bg-m3-surface p-4 sm:p-5">
        <div className="max-w-[480px]">
          <ListCardColumn
            listId="starred"
            listTitle={t('nav.starred')}
            tasks={starredTasks}
            isSmartFilter={true}
          />
        </div>
      </main>
    );
  }

  // 2. Specific List View (When user clicks a specific list in the sidebar)
  if (activeFilter !== 'all') {
    const currentList = lists.find((l) => l.id === activeFilter);
    if (currentList) {
      const listTasks = tasksByListId[currentList.id] || [];
      return (
        <main className="flex-1 h-full min-w-0 overflow-y-auto bg-m3-surface p-4 sm:p-5">
          <div className="max-w-[480px]">
            <ListCardColumn
              listId={currentList.id}
              listTitle={currentList.title}
              tasks={listTasks}
              isDefaultList={lists[0]?.id === currentList.id}
            />
          </div>
        </main>
      );
    }
  }

  return (
    <main className="flex-1 h-full min-w-0 overflow-y-auto bg-m3-surface p-4 sm:p-5">
      {displayLists.length > 0 ? (
        <div className="flex gap-4 items-start w-full max-w-[1550px] mx-auto">
          {columnLists.map((colLists, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-0">
              {colLists.map((list) => {
                const listTasks = tasksByListId[list.id] || [];
                return (
                  <ListCardColumn
                    key={list.id}
                    listId={list.id}
                    listTitle={list.title}
                    tasks={listTasks}
                    isDefaultList={lists[0]?.id === list.id}
                    isCardDraggable={displayLists.length > 1}
                    onCardDragStart={handleCardDragStart}
                    onCardDragOver={handleCardDragOver}
                    onCardDragLeave={handleCardDragLeave}
                    onCardDrop={handleCardDrop}
                    onCardDragEnd={handleCardDragEnd}
                    isCardDropTarget={dropTargetCardListId === list.id}
                    isCardDragged={draggedCardListId === list.id}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* When no lists are selected in sidebar */
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center select-none">
          <AllListsHiddenIllustration className="w-36 h-36 mb-3" />
          <p className="text-sm font-medium text-m3-on-surface">{t('board.noListsSelected')}</p>
          <p className="text-xs text-m3-outline mt-1 max-w-xs">
            {t('board.noListsSelectedDesc')}
          </p>
          <button
            type="button"
            onClick={setAllListsVisible}
            className="mt-4 px-4 py-2 text-xs font-medium text-m3-primary hover:bg-m3-primary/10 rounded-full transition-colors"
          >
            {t('board.showAllLists')}
          </button>
        </div>
      )}
    </main>
  );
};
