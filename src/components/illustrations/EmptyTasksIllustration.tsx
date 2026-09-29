import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { assetUrl } from '../../utils/assetUrl';

export const EmptyTasksIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => {
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme);
  const isDark = effectiveTheme === 'dark';

  const src = assetUrl(isDark ? 'tasks/empty-tasks-dark.svg' : 'tasks/empty-tasks-light.svg');

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={src}
        alt="Nenhuma tarefa ainda"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  );
};
