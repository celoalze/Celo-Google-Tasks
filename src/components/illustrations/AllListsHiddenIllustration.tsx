import React from 'react';
import { assetUrl } from '../../utils/assetUrl';

export const AllListsHiddenIllustration: React.FC<{ className?: string }> = ({
  className = 'w-32 h-32',
}) => {
  const src = assetUrl('tasks/all-task-lists-hidden-dark.svg');

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={src}
        alt="Nenhuma lista selecionada"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  );
};
