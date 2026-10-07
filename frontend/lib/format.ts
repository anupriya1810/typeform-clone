export const publicUrl = (slug: string) =>
  `${typeof window === "undefined" ? "" : window.location.origin}/to/${slug}`;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string) {
  const secs = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, s] of steps) if (Math.abs(secs) >= s) return rtf.format(Math.round(secs / s), unit);
  return "just now";
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
