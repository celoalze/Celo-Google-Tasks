import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';

export const NothingStarredIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36',
}) => {
  const themeMode = useThemeStore((state) => state.themeMode);
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const localSrc = isDark ? '/tasks/nothing-starred-dark.svg' : '/tasks/nothing-starred-light.svg';
  const remoteFallback = isDark
    ? 'https://www.gstatic.com/tasks/nothing-starred-dark.svg'
    : 'https://www.gstatic.com/tasks/nothing-starred-light.svg';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={localSrc}
        alt="Nenhuma tarefa com estrela"
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
