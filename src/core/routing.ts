import type { Profile } from "@/core/types";

export function getPostAuthRoute(profile: Profile | null | undefined) {
  if (!profile?.dob) {
    return "/(onboarding)/age" as const;
  }

  if (!profile.displayName && !profile.avatarUrl) {
    return "/(onboarding)/profile" as const;
  }

  if (!profile.username) {
    return "/(onboarding)/username" as const;
  }

  return "/(tabs)/share" as const;
}
