import React, { useEffect, useState } from 'react';
import { useI18nStore } from '../../store/useI18nStore';
import { useTaskStore } from '../../store/useTaskStore';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const t = useI18nStore((state) => state.t);
  const isGoogleConnected = useTaskStore((state) => state.isGoogleConnected);
  const isSyncing = useTaskStore((state) => state.isSyncing);
  const syncTasks = useTaskStore((state) => state.syncTasks);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    window.electronAPI?.maximizeWindow();
    const max = await window.electronAPI?.isWindowMaximized();
    setIsMaximized(max ?? false);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  useEffect(() => {
    const checkMax = async () => {
      const max = await window.electronAPI?.isWindowMaximized();
      setIsMaximized(max ?? false);
    };
    checkMax();
  }, []);

  return (
    <header className="h-8 w-full bg-m3-surface flex items-center justify-between select-none titlebar-drag-region z-50">
      {/* Left: Google Tasks Logo + Title */}
      <div className="flex items-center gap-2 cursor-default titlebar-no-drag pl-3">
        <div className="w-4 h-4 rounded-full bg-m3-primary text-m3-on-primary flex items-center justify-center shadow-sm">
          <span className="material-symbols-rounded text-[11px] font-bold">check</span>
        </div>
        <span className="text-[12px] text-m3-on-surface-variant font-normal tracking-wide">
          {t('common.tasks')}
        </span>
      </div>

      {/* Center: Draggable Spacer */}
      <div className="flex-1 h-full" />

      {/* Right: Actions & Windows Standard Caption Controls (32px height, 46px width) */}
      <div className="flex items-center h-full titlebar-no-drag">
        {/* Quick Cloud Sync Button */}
        {isGoogleConnected && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => syncTasks({ silent: false })}
            className="h-full px-3 flex items-center justify-center text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-on-surface/10 active:bg-m3-on-surface/20 transition-colors focus:outline-none disabled:opacity-50"
            title={t('titlebar.sync')}
          >
            <span
              className={`material-symbols-rounded text-[15px] ${
                isSyncing ? 'animate-spin text-m3-primary' : ''
              }`}
            >
              sync
            </span>
          </button>
        )}

        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          className="h-full w-[46px] flex items-center justify-center text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-on-surface/10 active:bg-m3-on-surface/20 transition-colors focus:outline-none"
          title={t('titlebar.minimize')}
        >
          <span className="material-symbols-rounded text-[14px]">remove</span>
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleMaximize}
          className="h-full w-[46px] flex items-center justify-center text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-on-surface/10 active:bg-m3-on-surface/20 transition-colors focus:outline-none"
          title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
        >
          <span className="material-symbols-rounded text-[12px]">
            {isMaximized ? 'filter_none' : 'crop_square'}
          </span>
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="h-full w-[46px] flex items-center justify-center text-m3-on-surface-variant hover:text-white hover:bg-[#e81123] active:bg-[#f1707a] transition-colors focus:outline-none"
          title={t('titlebar.close')}
        >
          <span className="material-symbols-rounded text-[14px]">close</span>
        </button>
      </div>
    </header>
  );
};
