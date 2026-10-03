export const weddingMemberRoles = [
  { value: "OWNER", label: "Owner", description: "Can manage wedding plans, members, and settings, including deleting the wedding." },
  { value: "EDITOR", label: "Editor", description: "Can view and edit wedding plans. Cannot manage members or delete the wedding." },
  { value: "VIEWER", label: "Viewer", description: "Can view wedding plans without making changes." },
] as const;

export type WeddingMemberRoleValue = typeof weddingMemberRoles[number]["value"];

export function isWeddingMemberRole(value: unknown): value is WeddingMemberRoleValue {
  return weddingMemberRoles.some((role) => role.value === value);
}

export function getWeddingMemberRoleLabel(value: string) {
  return weddingMemberRoles.find((role) => role.value === value)?.label ?? value;
}
