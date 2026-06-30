import { Profile } from "@/types/models";

export function serializeProfile(profile: Profile) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email ?? null,
    avatar: profile.avatar,
    role: profile.role,
  };
}

export type ProfilePayload = ReturnType<typeof serializeProfile>;
