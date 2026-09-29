import React, { useEffect, useRef } from 'react';
import { TitleBar } from './components/chrome/TitleBar';
import { Sidebar } from './components/navigation/Sidebar';
import { MainTaskView } from './components/tasks/MainTaskView';
import { TaskModal } from './components/tasks/TaskModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { useTaskStore } from './store/useTaskStore';
import { useThemeStore } from './store/useThemeStore';
import { useI18nStore } from './store/useI18nStore';
import { startNotificationScheduler, snoozeTask } from './core/notificationScheduler';
import { createTaskbarBadgeDataUrl, createTrayBadgeIconDataUrl } from './core/badgeGenerator';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

export const App: React.FC = () => {
  const init = useTaskStore((state) => state.init);
  const initTheme = useThemeStore((state) => state.initTheme);
  const initI18n = useI18nStore((state) => state.initI18n);
  const t = useI18nStore((state) => state.t);
  const pendingCount = useTaskStore((s) => s.tasks.filter((x) => !x.completed).length);
  const isLoading = useTaskStore((state) => state.isLoading);
  const isGoogleConnected = useTaskStore((state) => state.isGoogleConnected);
  const openEditTaskModal = useTaskStore((state) => state.openEditTaskModal);
  const toggleTaskCompletion = useTaskStore((state) => state.toggleTaskCompletion);
  const syncTasks = useTaskStore((state) => state.syncTasks);

  const lastBadgeCountRef = useRef<number>(-1);

  useEffect(() => {
    initTheme();
    initI18n();
    init();
  }, [init, initTheme, initI18n]);

  // Periodic background cloud sync (heartbeat ping every 30s) and sync on window focus / shortcuts
  useEffect(() => {
    if (!isGoogleConnected) return;

    // 1. Periodic background heartbeat ping (every 30 seconds, silent)
    const intervalId = setInterval(() => {
      syncTasks({ silent: true });
    }, 30000);

    // 2. Window focus listener (sync when user returns to the app)
    const handleFocus = () => {
      syncTasks({ silent: true });
    };
    window.addEventListener('focus', handleFocus);

    // 3. Keyboard shortcut (F5 or Ctrl+R / Cmd+R to force refresh)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault();
        syncTasks({ silent: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGoogleConnected, syncTasks]);

  // Sync taskbar & tray overlay notification badge on Windows/macOS with pending tasks
  useEffect(() => {
    if (!window.electronAPI?.setBadge) return;

    if (pendingCount === lastBadgeCountRef.current) return;
    lastBadgeCountRef.current = pendingCount;

    const badgeDataUrl = createTaskbarBadgeDataUrl(pendingCount);
    const trayDataUrl = createTrayBadgeIconDataUrl(pendingCount);

    window.electronAPI.setBadge(pendingCount, badgeDataUrl, trayDataUrl).catch((err) => {
      console.warn('Falha ao sincronizar badge da barra de tarefas:', err);
    });
  }, [pendingCount]);

  // Start background task reminder scheduler and listen for notification clicks and button actions
  useEffect(() => {
    const stopScheduler = startNotificationScheduler(() => useTaskStore.getState().tasks);

    let stopClickListener: (() => void) | undefined;
    if (window.electronAPI?.onNotificationClicked) {
      stopClickListener = window.electronAPI.onNotificationClicked((taskId) => {
        const found = useTaskStore.getState().tasks.find((t) => t.id === taskId);
        if (found) {
          openEditTaskModal(found);
        }
      });
    }

    let stopActionListener: (() => void) | undefined;
    if (window.electronAPI?.onNotificationAction) {
      stopActionListener = window.electronAPI.onNotificationAction(async ({ action, taskId }) => {
        if (action === 'complete') {
          if (taskId && taskId !== 'test-task') {
            await toggleTaskCompletion(taskId);
          }
        } else if (action === 'snooze') {
          if (taskId) {
            snoozeTask(taskId, 15);
          }
        }
      });
    }

    return () => {
      stopScheduler();
      if (stopClickListener) stopClickListener();
      if (stopActionListener) stopActionListener();
    };
  }, [openEditTaskModal, toggleTaskCompletion]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-m3-surface text-m3-on-surface font-sans">
      {/* Frameless Custom TitleBar */}
      <TitleBar />

      {/* Main Google Tasks Layout */}
      <ErrorBoundary>
        <div className="flex flex-1 min-h-0 relative">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-rounded text-m3-primary text-[36px] animate-spin">
                  progress_activity
                </span>
                <span className="text-xs text-m3-on-surface-variant/70">
                  {t('common.loading')}
                </span>
              </div>
            </div>
          ) : !isGoogleConnected ? (
            <LoginScreen />
          ) : (
            <>
              {/* 1. Left Sidebar Navigation */}
              <Sidebar />

              {/* 2. Center Main Task View Card */}
              <MainTaskView />
            </>
          )}
        </div>
      </ErrorBoundary>

      {/* Google Tasks Official Task Dialog */}
      <ErrorBoundary>
        <TaskModal />
      </ErrorBoundary>

      {/* Google Credentials & Settings Modal */}
      <ErrorBoundary>
        <SettingsModal />
      </ErrorBoundary>
    </div>
  );
};
