import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import { calculateCounts } from '../../core/smartFilters';
import { M3Button, M3Dialog, M3TextField, M3NavItem } from '../ui';
import { GoogleTasksAddIcon } from '../ui/icons/GoogleTasksAddIcon';

export const Sidebar: React.FC = () => {
  const lists = useTaskStore((state) => state.lists);
  const tasks = useTaskStore((state) => state.tasks);
  const activeFilter = useTaskStore((state) => state.activeFilter);
  const visibleListIds = useTaskStore((state) => state.visibleListIds);
  const user = useTaskStore((state) => state.user);
  const isGoogleConnected = useTaskStore((state) => state.isGoogleConnected);
  const draggedTaskId = useTaskStore((state) => state.draggedTaskId);

  const setActiveFilter = useTaskStore((state) => state.setActiveFilter);
  const createList = useTaskStore((state) => state.createList);
  const openCreateTaskModal = useTaskStore((state) => state.openCreateTaskModal);
  const toggleListVisibility = useTaskStore((state) => state.toggleListVisibility);
  const setIsSettingsOpen = useTaskStore((state) => state.setIsSettingsOpen);
  const moveTaskToList = useTaskStore((state) => state.moveTaskToList);
  const setDraggedTaskId = useTaskStore((state) => state.setDraggedTaskId);

  const t = useI18nStore((state) => state.t);

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isListsExpanded, setIsListsExpanded] = useState(true);
  const [dropTargetListId, setDropTargetListId] = useState<string | null>(null);

  const { smartCounts, listCounts } = useMemo(
    () => calculateCounts(tasks, lists),
    [tasks, lists]
  );

  const handleCreateList = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newListName.trim()) {
      setIsCreatingList(false);
      return;
    }
    await createList(newListName.trim());
    setNewListName('');
    setIsCreatingList(false);
  };

  return (
    <aside className="w-64 h-full bg-m3-surface flex flex-col px-3 py-4 select-none flex-shrink-0">
      {/* 1. Extended FAB: + Criar */}
      <M3Button
        variant="tonal"
        size="lg"
        shape="rounded"
        icon={<GoogleTasksAddIcon size={20} className="text-m3-primary" />}
        onClick={() => openCreateTaskModal()}
        className="mb-5 shadow-md self-start !px-5 !py-3.5 !text-sm"
      >
        {t('nav.createButton')}
      </M3Button>

      {/* 2. Top Navigation: Todas as tarefas & Com estrela */}
      <div className="space-y-1">
        <M3NavItem
          icon="task_alt"
          label={t('nav.allTasks')}
          active={activeFilter === 'all'}
          badge={smartCounts.all > 0 ? smartCounts.all : undefined}
          onClick={() => setActiveFilter('all')}
        />

        <M3NavItem
          icon="star"
          iconFilled={activeFilter === 'starred'}
          label={t('nav.starred')}
          active={activeFilter === 'starred'}
          badge={smartCounts.starred > 0 ? smartCounts.starred : undefined}
          onClick={() => setActiveFilter('starred')}
        />
      </div>

      {/* Spacer */}
      <div className="my-2" />

      {/* 3. Listas Accordion Header */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <button
          type="button"
          onClick={() => setIsListsExpanded(!isListsExpanded)}
          className="w-full h-10 min-h-[40px] px-4 rounded-full flex items-center justify-between text-sm font-medium text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-[#292929] transition-colors focus:outline-none"
        >
          <span>{t('nav.lists')}</span>
          <div className="w-5 h-5 shrink-0 ml-2 flex items-center justify-center">
            <span
              className={`material-symbols-rounded text-[20px] transition-transform duration-200 ${
                isListsExpanded ? 'rotate-0' : 'rotate-180'
              }`}
            >
              keyboard_arrow_up
            </span>
          </div>
        </button>

        {/* User's Real Google Lists */}
        {isListsExpanded && (
          <div className="space-y-1 pt-0.5">
            {lists.map((list) => {
              const isVisible = visibleListIds.includes(list.id);
              const isActive = activeFilter === list.id;
              const count = listCounts[list.id] || 0;
              const isDropTarget = dropTargetListId === list.id;

              return (
                <div
                  key={list.id}
                  onDragOver={(e) => {
                    if (draggedTaskId) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dropTargetListId !== list.id) {
                        setDropTargetListId(list.id);
                      }
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dropTargetListId === list.id) {
                        setDropTargetListId(null);
                      }
                    }
                  }}
                  onDrop={async (e) => {
                    if (draggedTaskId) {
                      e.preventDefault();
                      const taskId =
                        e.dataTransfer.getData('text/task-id') ||
                        e.dataTransfer.getData('text/plain') ||
                        draggedTaskId;

                      setDropTargetListId(null);
                      setDraggedTaskId(null);
                      if (taskId) {
                        await moveTaskToList(taskId, list.id);
                      }
                    }
                  }}
                  className={`rounded-full transition-all duration-150 ${
                    isDropTarget ? 'ring-2 ring-m3-primary bg-m3-primary/10' : ''
                  }`}
                >
                  <M3NavItem
                    label={list.title}
                    active={isActive}
                    badge={count > 0 ? count : undefined}
                    onClick={() => setActiveFilter(list.id)}
                    leading={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleListVisibility(list.id);
                        }}
                        title={isVisible ? t('nav.hideFromBoard') : t('nav.showOnBoard')}
                        className="w-5 h-5 flex items-center justify-center text-m3-outline hover:text-m3-primary transition-colors focus:outline-none"
                      >
                        <span className="material-symbols-rounded text-[20px]">
                          {isVisible ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                      </button>
                    }
                  />
                </div>
              );
            })}

            {/* + Criar nova lista Button */}
            <M3NavItem
              icon="add"
              label={t('nav.newList')}
              onClick={() => {
                setNewListName('');
                setIsCreatingList(true);
              }}
            />
          </div>
        )}
      </div>

      {/* 4. Bottom Authenticated User Profile */}
      <div className="pt-2 mt-auto">
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          title={
            isGoogleConnected
              ? `${user.displayName} (${user.email}) - ${t('common.settings')}`
              : t('nav.connectGoogle')
          }
          className="group w-full h-12 min-h-[48px] px-4 rounded-full flex items-center justify-between hover:bg-black/5 dark:hover:bg-[#292929] active:bg-m3-on-surface/10 transition-colors text-left focus:outline-none"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar Circle */}
            <div className="w-8 h-8 rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'GT'}</span>
              )}
            </div>

            {/* User Name & Email */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-m3-on-surface truncate">
                {isGoogleConnected ? user.displayName : 'Google Tasks'}
              </div>
              <div className="text-[11px] text-m3-outline truncate group-hover:text-m3-on-surface-variant transition-colors">
                {isGoogleConnected ? user.email : t('nav.connectGoogle')}
              </div>
            </div>
          </div>

          {/* Settings Icon in standardized 20x20 slot */}
          <div className="w-5 h-5 shrink-0 ml-2 flex items-center justify-center">
            <span className="material-symbols-rounded text-[20px] text-m3-outline group-hover:text-m3-on-surface transition-colors">
              settings
            </span>
          </div>
        </button>
      </div>

      {/* Modal / Dialog: Criar nova lista (Google Tasks Official) */}
      <M3Dialog
        isOpen={isCreatingList}
        onClose={() => {
          setNewListName('');
          setIsCreatingList(false);
        }}
        title={t('nav.newList')}
        actions={
          <>
            <M3Button
              variant="text"
              onClick={() => {
                setNewListName('');
                setIsCreatingList(false);
              }}
            >
              {t('common.cancel')}
            </M3Button>
            <M3Button
              variant="text"
              disabled={!newListName.trim()}
              onClick={() => handleCreateList()}
            >
              {t('common.save')}
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleCreateList}>
          <M3TextField
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={t('taskModal.titlePlaceholder')}
          />
        </form>
      </M3Dialog>
    </aside>
  );
};
