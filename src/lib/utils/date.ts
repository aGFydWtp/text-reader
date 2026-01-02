const dateFormatter = Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tokyo",
});

export function formatJst(value?: string | number) {
  if (!value) return "-";
  const date = new Date(value);
  return dateFormatter.format(date);
}
