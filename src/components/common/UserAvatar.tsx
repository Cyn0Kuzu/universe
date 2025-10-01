import React from 'react';
import { UniversalAvatar } from './UniversalAvatar';

interface UserAvatarProps {
  profileImage?: string;
  displayName?: string;
  email?: string;
  size?: number;
  backgroundColor?: string;
  userId?: string;
  avatarIcon?: string;
  avatarColor?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  profileImage,
  displayName,
  email,
  size = 50,
  backgroundColor = '#2196F3',
  userId,
  avatarIcon,
  avatarColor
}) => {
  return (
    <UniversalAvatar 
      user={{
        id: userId,
        name: displayName || (email ? email.split('@')[0] : undefined),
        profileImage: profileImage,
        avatarIcon: avatarIcon,
        avatarColor: avatarColor
      }}
      size={size}
      fallbackIcon="account"
      fallbackColor={backgroundColor}
    />
  );
};

export default UserAvatar;
