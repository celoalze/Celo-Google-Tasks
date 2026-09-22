import React, { useEffect, useRef, useState } from 'react';
import { Task } from '../../contracts/tasks.types';
import { useTaskStore } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import { M3Menu, M3MenuItem, M3MenuDivider } from '../ui/M3Menu';
import { M3Dialog } from '../ui/M3Dialog';
import { M3TextField } from '../ui/M3TextField';
import { M3Button } from '../ui/M3Button';

interface TaskContextMenuProps {
  task: Task;
  x: number;
  y: number;
  onClose: () => void;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  task,
  x,
  y,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentTitle, setAttachmentTitle] = useState('');

  const t = useI18nStore((state) => state.t);

  const {
    lists,
    updateTask,
    moveTaskToList,
    deleteTask,
    createList,
  } = useTaskStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isCreatingList || isAddingAttachment) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCreatingList || isAddingAttachment) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isCreatingList, isAddingAttachment]);

  // Adjust coordinates so the menu stays inside the viewport
  const menuWidth = 224;
  const menuHeight = 320;
  const adjustedX = Math.min(x, Math.max(10, window.innerWidth - menuWidth - 16));
  const adjustedY = Math.min(y, Math.max(10, window.innerHeight - menuHeight - 16));

  const handleCreateListAndMove = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const created = await createList(trimmed);
    if (created) {
      await moveTaskToList(task.id, created.id);
    }
    setIsCreatingList(false);
    onClose();
  };

  const handleSaveAttachment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUrl = attachmentUrl.trim();
    if (!trimmedUrl) return;
    const currentLinks = task.links ? [...task.links] : [];
    const newLink = {
      type: 'attachment',
      description: attachmentTitle.trim() || trimmedUrl,
      link: trimmedUrl,
    };
    await updateTask(task.id, { links: [...currentLinks, newLink] });
    setIsAddingAttachment(false);
    onClose();
  };

  return (
    <>
      {!isCreatingList && !isAddingAttachment && (
        <div
          ref={menuRef}
          style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
          className="fixed z-50 select-none"
        >
          <M3Menu width="w-56">
            {/* 1. Adicionar anexo */}
            <M3MenuItem
              icon="add_to_drive"
              label={t('contextMenu.addAttachment')}
              onClick={() => setIsAddingAttachment(true)}
            />

            {/* 2. Excluir */}
            <M3MenuItem
              icon="delete"
              label={t('contextMenu.delete')}
              onClick={() => {
                deleteTask(task.id);
                onClose();
              }}
            />

            <M3MenuDivider />

            {/* 3. User lists */}
            {lists.map((list) => {
              const isCurrent = task.listId === list.id;
              return (
                <M3MenuItem
                  key={list.id}
                  selected={isCurrent}
                  indent={true}
                  label={list.title}
                  onClick={async () => {
                    if (!isCurrent) {
                      await moveTaskToList(task.id, list.id);
                    }
                    onClose();
                  }}
                />
              );
            })}

            {/* 4. Nova lista */}
            <M3MenuItem
              icon="post_add"
              label={t('contextMenu.newList')}
              onClick={() => setIsCreatingList(true)}
            />

            {/* External Gmail/Docs/Drive links if present */}
            {(task.webViewLink || (task.links && task.links.length > 0)) && (
              <>
                <M3MenuDivider />

                {task.webViewLink && (
                  <M3MenuItem
                    icon="open_in_new"
                    label={t('contextMenu.openInWeb')}
                    onClick={() => {
                      window.electronAPI?.openExternal(task.webViewLink!);
                      onClose();
                    }}
                  />
                )}

                {task.links &&
                  task.links.map((link, idx) => (
                    <M3MenuItem
                      key={idx}
                      icon={link.type === 'attachment' ? 'attachment' : 'mail'}
                      label={
                        link.description ||
                        (link.type === 'attachment' ? link.link : t('contextMenu.openInGmail'))
                      }
                      trailing={
                        <span className="material-symbols-rounded text-[14px] text-m3-outline">
                          open_in_new
                        </span>
                      }
                      onClick={() => {
                        window.electronAPI?.openExternal(link.link);
                        onClose();
                      }}
                    />
                  ))}
              </>
            )}
          </M3Menu>
        </div>
      )}

      {/* Modal: Nova lista */}
      <M3Dialog
        isOpen={isCreatingList}
        onClose={() => {
          setIsCreatingList(false);
          onClose();
        }}
        title={t('contextMenu.newList')}
        actions={
          <>
            <M3Button
              variant="text"
              onClick={() => {
                setIsCreatingList(false);
                onClose();
              }}
            >
              {t('common.cancel')}
            </M3Button>
            <M3Button
              variant="text"
              disabled={!newListName.trim()}
              onClick={() => handleCreateListAndMove()}
            >
              {t('common.save')}
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleCreateListAndMove}>
          <M3TextField
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={t('taskModal.titlePlaceholder') || 'Nome da lista'}
          />
        </form>
      </M3Dialog>

      {/* Modal: Adicionar anexo */}
      <M3Dialog
        isOpen={isAddingAttachment}
        onClose={() => {
          setIsAddingAttachment(false);
          onClose();
        }}
        title={t('contextMenu.addAttachment')}
        actions={
          <>
            <M3Button
              variant="text"
              onClick={() => {
                setIsAddingAttachment(false);
                onClose();
              }}
            >
              {t('common.cancel')}
            </M3Button>
            <M3Button
              variant="text"
              disabled={!attachmentUrl.trim()}
              onClick={() => handleSaveAttachment()}
            >
              {t('common.save')}
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSaveAttachment} className="space-y-3">
          <M3TextField
            autoFocus
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            label="URL do link ou Google Drive"
          />
          <M3TextField
            value={attachmentTitle}
            onChange={(e) => setAttachmentTitle(e.target.value)}
            placeholder="Ex: Documento de Requisitos"
            label="Título do anexo (opcional)"
          />
        </form>
      </M3Dialog>
    </>
  );
};
