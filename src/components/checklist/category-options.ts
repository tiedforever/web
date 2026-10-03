import type { IconName } from "../shared/icons";

export const categoryIconOptions = [
  { value: "sparkles", label: "Sparkles" },
  { value: "checklist", label: "Checklist" },
  { value: "calendar", label: "Calendar" },
  { value: "pin", label: "Pin" },
  { value: "venue", label: "Venue" },
  { value: "users", label: "People" },
  { value: "heart", label: "Heart" },
  { value: "gift", label: "Gift" },
  { value: "note", label: "Notes" },
  { value: "file", label: "Document" },
] as const satisfies ReadonlyArray<{ value: IconName; label: string }>;

export const categoryColourOptions = [
  { value: "#2D5A27", label: "Green" },
  { value: "#9A6E30", label: "Gold" },
  { value: "#B45F64", label: "Rose" },
  { value: "#4A6FA5", label: "Blue" },
  { value: "#8B6FAE", label: "Lavender" },
] as const;

export function isCategoryIcon(value: string): value is IconName {
  return categoryIconOptions.some((option) => option.value === value);
}
