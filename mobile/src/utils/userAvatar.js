import { getImageUrl } from '../api/config';

export const getUserAvatarUri = (user) => {
  if (!user) return null;

  if (user.profileImage) {
    return getImageUrl(user.profileImage);
  }

  if (user.avatar) {
    return user.avatar;
  }

  return null;
};

export const getUserInitial = (name) => {
  const initial = (name || '').trim().charAt(0);
  return (initial || 'U').toUpperCase();
};
