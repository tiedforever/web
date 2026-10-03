export type IconName =
  | "bell"
  | "calendar"
  | "checklist"
  | "chevron-down"
  | "chevron-right"
  | "dashboard"
  | "dollar"
  | "edit"
  | "file"
  | "gift"
  | "grid"
  | "heart"
  | "menu"
  | "more"
  | "note"
  | "pin"
  | "plus"
  | "search"
  | "settings"
  | "sparkles"
  | "trash"
  | "users"
  | "venue"
  | "x";

const paths: Record<IconName, string> = {
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  calendar: "M5 4h14v16H5zM8 2v4M16 2v4M5 9h14",
  checklist: "M4 5h16M4 12h16M4 19h10M6 5h.01M6 12h.01M6 19h.01",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-right": "m9 6 6 6-6 6",
  dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  dollar: "M12 2v20M17 6.5C16 5.5 14.6 5 12.8 5 10.7 5 9 6.1 9 7.8c0 4.2 8 2.2 8 6.4 0 1.8-1.7 3-4.2 3-2 0-3.5-.6-4.8-1.8",
  edit: "M4 20h4L19 9l-4-4L4 16v4M13.5 6.5l4 4",
  file: "M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6",
  gift: "M20 12v8H4v-8M2 8h20v4H2zM12 8v12M12 8H8.5A2.5 2.5 0 1 1 11 5.5V8M12 8h3.5A2.5 2.5 0 1 0 13 5.5V8",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  heart: "M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6.1a4.6 4.6 0 0 1 8.8 2.5Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  note: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  pin: "M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  plus: "M12 5v14M5 12h14",
  search: "m20 20-4.5-4.5M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8.1 15a1.7 1.7 0 0 0-1.6-1H6v-2.5h.5a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5H15v.5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V14h-.1a1.7 1.7 0 0 0-1.6 1Z",
  sparkles: "m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3ZM19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15ZM5 15l.5 2L7.5 17l-2 .5L5 19l-.5-1.5-2-.5 2-.5L5 15Z",
  trash: "M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 14h8l1-14",
  users: "M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.5a3.5 3.5 0 0 1 0 6.8M18 15a3.5 3.5 0 0 1 2 3.2V20",
  venue: "M4 20h16M6 20V8h12v12M8 8V5h8v3M9 11h2M13 11h2M9 15h2M13 15h2",
  x: "M6 6l12 12M18 6 6 18",
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
