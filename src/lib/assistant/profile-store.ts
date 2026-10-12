import {
  applyCustomerProfilePatch,
  emptyCustomerProfile,
  type CustomerProfile,
} from "@/lib/assistant/customer-profile";

const profiles = new Map<string, CustomerProfile>();

export function readCustomerProfile(userId: string): CustomerProfile {
  return profiles.get(userId) ?? emptyCustomerProfile();
}

export function writeCustomerProfile(
  userId: string,
  patch: unknown
): { ok: true; profile: CustomerProfile } | { ok: false; error: string } {
  const applied = applyCustomerProfilePatch(readCustomerProfile(userId), patch);
  if (!applied.ok) return applied;
  profiles.set(userId, applied.profile);
  return applied;
}
