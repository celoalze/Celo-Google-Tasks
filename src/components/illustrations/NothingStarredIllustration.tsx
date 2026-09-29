import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { assetUrl } from '../../utils/assetUrl';

export const NothingStarredIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36',
}) => {
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme);
  const isDark = effectiveTheme === 'dark';

  const src = assetUrl(isDark ? 'tasks/nothing-starred-dark.svg' : 'tasks/nothing-starred-light.svg');

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={src}
        alt="Nenhuma tarefa com estrela"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  );
};
