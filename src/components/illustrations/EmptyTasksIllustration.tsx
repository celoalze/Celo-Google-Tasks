import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';

export const EmptyTasksIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => {
  const themeMode = useThemeStore((state) => state.themeMode);
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const localSrc = isDark ? '/tasks/empty-tasks-dark.svg' : '/tasks/empty-tasks-light.svg';
  const remoteFallback = isDark
    ? 'https://www.gstatic.com/tasks/empty-tasks-dark.svg'
    : 'https://www.gstatic.com/tasks/empty-tasks-light.svg';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={localSrc}
        alt="Nenhuma tarefa ainda"
        className="w-full h-full object-contain pointer-events-none"
        onError={(e) => {
          if (e.currentTarget.src !== remoteFallback) {
            e.currentTarget.src = remoteFallback;
          }
        }}
      />
    </div>
  );
};
