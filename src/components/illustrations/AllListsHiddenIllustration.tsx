import React from 'react';

export const AllListsHiddenIllustration: React.FC<{ className?: string }> = ({
  className = 'w-32 h-32',
}) => {
  const localSrc = '/tasks/all-task-lists-hidden-dark.svg';
  const remoteFallback = 'https://www.gstatic.com/tasks/all-task-lists-hidden-dark.svg';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={localSrc}
        alt="Nenhuma lista selecionada"
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
