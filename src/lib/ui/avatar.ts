export const AVATAR_PALETTE = [
  "#65ba73",
  "#ff7575",
  "#cab641",
  "#ffb84d",
  "#7e57ff",
  "#0073ea",
  "#00c875",
  "#ff6900",
];

// Picks a stable background color for a name from the shared palette.
export function pickAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Builds up-to-two-letter initials from a display name.
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
