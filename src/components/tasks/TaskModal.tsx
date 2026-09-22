import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import {
  extractDateString,
  toGoogleDueIso,
  formatFullDate,
} from '../../core/dateUtils';
import { M3Checkbox } from '../ui/M3Checkbox';
import { M3IconButton } from '../ui/M3IconButton';

export const TaskModal: React.FC = () => {
  const {
    isTaskModalOpen,
    editingTask,
    modalTargetListId,
    closeTaskModal,
    saveTaskFromModal,
    deleteTask,
    lists,
    addSubtask,
    toggleSubtaskCompletion,
    deleteSubtask,
    promoteSubtask,
  } = useTaskStore();

  const t = useI18nStore((state) => state.t);
  const locale = useI18nStore((state) => state.locale);

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [notes, setNotes] = useState('');
  const [listId, setListId] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDateStr(extractDateString(editingTask.due) || '');
      setNotes(editingTask.notes || '');
      setListId(editingTask.listId);
    } else {
      setTitle('');
      setDateStr(new Date().toISOString().split('T')[0]);
      setNotes('');
      setListId(modalTargetListId || lists[0]?.id || '');
    }
    setShowDatePicker(false);
  }, [editingTask, modalTargetListId, lists, isTaskModalOpen]);

  if (!isTaskModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const due = dateStr ? toGoogleDueIso(dateStr) : undefined;

    await saveTaskFromModal({
      id: editingTask?.id,
      listId: listId || lists[0]?.id || '@default',
      title: title.trim(),
      due,
      notes: notes.trim(),
    });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newSubtaskTitle.trim()) return;
    await addSubtask(editingTask.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div
        className="bg-m3-surface-container-high rounded-[24px] max-w-[460px] w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative text-m3-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Action Icons (Close & Delete) - Exactly matching Screenshot */}
        <div className="flex items-center justify-end gap-1 mb-2">
          {editingTask && (
            <M3IconButton
              icon="delete"
              size="md"
              title={t('taskModal.deleteTask')}
              colorClass="text-m3-outline hover:text-m3-error"
              onClick={() => deleteTask(editingTask.id)}
            />
          )}
          <M3IconButton
            icon="close"
            size="md"
            title={t('common.close')}
            onClick={closeTaskModal}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('taskModal.titlePlaceholder')}
              className="w-full bg-transparent text-lg font-medium text-m3-on-surface placeholder:text-m3-outline pb-2 border-b border-m3-outline-variant/40 focus:border-m3-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Date & Time Row */}
          <div className="flex items-start gap-3 pt-2">
            <span className="material-symbols-rounded text-m3-outline text-[22px] pt-1">
              schedule
            </span>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Date Chip */}
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="px-3.5 py-1.5 rounded-lg bg-m3-surface-container-highest hover:bg-m3-surface-bright text-xs font-medium text-m3-on-surface transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-[16px] text-m3-primary">event</span>
                  <span>{formatFullDate(dateStr, locale)}</span>
                </button>

                {dateStr && (
                  <button
                    type="button"
                    onClick={() => setDateStr('')}
                    title={t('dateTime.removeDate') || 'Remover data'}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 text-m3-outline hover:text-m3-on-surface transition-colors"
                  >
                    <span className="material-symbols-rounded text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Inline Date Input dropdown when clicking date chip */}
              {showDatePicker && (
                <div className="p-2 bg-m3-surface-container rounded-lg animate-in fade-in">
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => {
                      setDateStr(e.target.value);
                      setShowDatePicker(false);
                    }}
                    className="w-full bg-transparent text-xs text-m3-on-surface focus:outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description / Notes Section */}
          <div className="flex items-start gap-3 pt-1">
            <span className="material-symbols-rounded text-m3-outline text-[22px] pt-2">
              notes
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('taskModal.addDescription')}
              className="flex-1 bg-m3-surface-container-highest rounded-xl p-3 text-xs text-m3-on-surface placeholder:text-m3-outline focus:outline-none resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* List Selector Section */}
          <div className="flex items-center gap-3 pt-1">
            <span className="material-symbols-rounded text-m3-outline text-[22px]">
              format_list_bulleted
            </span>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="bg-m3-surface-container-highest hover:bg-m3-surface-bright text-xs text-m3-on-surface px-3.5 py-1.5 rounded-lg focus:outline-none cursor-pointer transition-colors"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id} className="bg-m3-surface-container-high text-m3-on-surface">
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* External Links & Integrations (Gmail, Google Docs/Chat, Google Tasks Web) */}
          {editingTask && (editingTask.webViewLink || (editingTask.links && editingTask.links.length > 0) || editingTask.assignmentInfo) && (
            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-semibold text-m3-on-surface-variant/70 uppercase tracking-wider">
                {t('taskModal.integrationsTitle')}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Gmail Links */}
                {editingTask.links && editingTask.links.map((link, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => window.electronAPI?.openExternal(link.link)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-m3-error/15 text-m3-error hover:bg-m3-error/25 transition-colors"
                    title={link.description || t('contextMenu.openInGmail')}
                  >
                    <span className="material-symbols-rounded text-[16px]">mail</span>
                    <span className="max-w-[200px] truncate">{link.description || t('contextMenu.openInGmail')}</span>
                    <span className="material-symbols-rounded text-[14px]">open_in_new</span>
                  </button>
                ))}

                {/* Assignment info */}
                {editingTask.assignmentInfo && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-m3-primary/15 text-m3-primary">
                    <span className="material-symbols-rounded text-[16px]">
                      {editingTask.assignmentInfo.driveResourceInfo ? 'description' : 'forum'}
                    </span>
                    <span>
                      {editingTask.assignmentInfo.driveResourceInfo
                        ? t('taskModal.assignedInDocs')
                        : t('taskModal.assignedInChat')}
                    </span>
                  </div>
                )}

                {/* Web View Link */}
                {editingTask.webViewLink && (
                  <button
                    type="button"
                    onClick={() => window.electronAPI?.openExternal(editingTask.webViewLink!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-m3-surface-container-highest text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-bright transition-colors"
                    title={t('taskModal.openInWeb')}
                  >
                    <span className="material-symbols-rounded text-[16px] text-m3-primary">task_alt</span>
                    <span>{t('taskModal.openInWeb')}</span>
                    <span className="material-symbols-rounded text-[14px]">open_in_new</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Subtasks Section (if editing existing task) */}
          {editingTask && (
            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-semibold text-m3-on-surface-variant/70 uppercase tracking-wider">
                {t('taskModal.subtasksTitle')} ({editingTask.subtasks.length})
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto">
                {editingTask.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2.5 px-2 py-1 rounded-lg bg-m3-surface-container/60 hover:bg-m3-surface-container group transition-colors"
                  >
                    <M3Checkbox
                      checked={sub.completed}
                      onChange={() => toggleSubtaskCompletion(editingTask.id, sub.id)}
                      size="sm"
                    />
                    <span
                      className={`text-xs flex-1 truncate ${
                        sub.completed ? 'line-through text-m3-outline' : 'text-m3-on-surface'
                      }`}
                    >
                      {sub.title}
                    </span>
                    <M3IconButton
                      icon="arrow_upward"
                      size="xs"
                      title={t('taskModal.promoteSubtask')}
                      colorClass="text-m3-outline hover:text-m3-primary"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => promoteSubtask(editingTask.id, sub.id)}
                    />
                    <M3IconButton
                      icon="close"
                      size="xs"
                      title={t('taskModal.deleteSubtask')}
                      colorClass="text-m3-outline hover:text-m3-error"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteSubtask(editingTask.id, sub.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Add Subtask Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="material-symbols-rounded text-m3-primary text-[18px]">add</span>
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask(e);
                    }
                  }}
                  placeholder={`${t('taskModal.subtaskPlaceholder')} (Enter)`}
                  className="bg-transparent text-xs text-m3-on-surface placeholder:text-m3-outline focus:outline-none flex-1"
                />
              </div>
            </div>
          )}

          {/* Actions Footer - Exactly matching Google Tasks Web screenshot */}
          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              disabled={!title.trim()}
              className={`px-6 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                title.trim()
                  ? 'bg-m3-primary text-m3-on-primary hover:brightness-105 cursor-pointer shadow-sm'
                  : 'bg-m3-on-surface/[0.08] text-m3-outline/40 cursor-not-allowed'
              }`}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
