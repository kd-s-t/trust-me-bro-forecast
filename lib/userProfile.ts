export type UserProfile = {
  username: string;
  displayName: string;
  avatarUrl: string;
};

export function defaultDisplayName(username: string): string {
  return username
    .split(/[-_\s]+/)
    .filter((p) => p.length > 0)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export const DEFAULT_AVATAR_URL = "/wolf.png";

export function defaultAvatarUrl(): string {
  return DEFAULT_AVATAR_URL;
}
