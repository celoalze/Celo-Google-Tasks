import React, { useState, useEffect } from 'react';

export type UserAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface UserAvatarProps {
  readonly photoUrl?: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly size?: UserAvatarSize | number;
  readonly className?: string;
}

const SIZE_CLASSES: Record<UserAvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-6 h-6', text: 'text-xs' },
  md: { container: 'w-8 h-8', text: 'text-xs' },
  lg: { container: 'w-9 h-9', text: 'text-sm' },
  xl: { container: 'w-12 h-12', text: 'text-base' },
};

function getInitial(displayName?: string, email?: string): string {
  if (displayName && displayName.trim().length > 0) {
    return displayName.trim().charAt(0).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.trim().charAt(0).toUpperCase();
  }
  return 'G';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  displayName,
  email,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when the photoUrl changes
  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const isNamedSize = typeof size === 'string';
  const sizeConfig = isNamedSize ? SIZE_CLASSES[size] : null;
  const initial = getInitial(displayName, email);

  const containerStyle = !isNamedSize
    ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
    : undefined;

  const sizeClass = sizeConfig ? `${sizeConfig.container} ${sizeConfig.text}` : 'text-sm';

  return (
    <div
      style={containerStyle}
      className={`rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center font-medium overflow-hidden flex-shrink-0 select-none shadow-sm ${sizeClass} ${className}`}
    >
      {!hasError && photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="leading-none">{initial}</span>
      )}
    </div>
  );
};
