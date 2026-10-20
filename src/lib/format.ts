export const colors = {
  ink: "#111110",
  muted: "#78716C",
  line: "#E7E5E4",
  paper: "#FAF8F5",
  white: "#FFFFFF",
  accent: "#E08A50",
  accentDark: "#C76F35",
  green: "#166534",
  greenBg: "#F0FDF4",
  red: "#B91C1C",
  amberBg: "#FFFBEB",
  amber: "#92400E",
};

export const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const dayFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

// "Today", "Tomorrow" or "2 Nov" for a yyyy-mm-dd delivery date
export function deliveryDay(date: string | null) {
  if (!date) return "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + 86_400_000));
  if (date === today) return "Today";
  if (date === tomorrow) return "Tomorrow";
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}
