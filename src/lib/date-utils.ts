/**
 * Parses date inputs from user query params safely handling timezone differences.
 * E.g., '2026-10-08' on a Pakistani user's machine (UTC+5) refers to the day spanning
 * 2026-10-07 19:00:00 UTC to 2026-10-08 19:00:00 UTC.
 * 
 * To ensure queries match all records for that day regardless of local/UTC offset:
 * - Start date begins at 00:00:00 PKT (19:00:00 UTC previous day) or 00:00:00 UTC
 * - End date covers up to 23:59:59.999 PKT or 23:59:59.999 UTC
 * - Auto-swaps if gte > lte to prevent accidental empty filters
 */
export function parseDateFilter(startDateStr?: string | null, endDateStr?: string | null) {
  let gte: Date | undefined = undefined;
  let lte: Date | undefined = undefined;

  const sStr = startDateStr?.trim();
  const eStr = endDateStr?.trim();

  if (sStr && sStr !== "ALL" && sStr !== "null" && sStr !== "undefined") {
    const cleanStart = sStr.split("T")[0];
    const parts = cleanStart.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // Start of day in Pakistan Standard Time (UTC+5):
      // 00:00:00 PKT = previous day 19:00:00 UTC.
      // We also account for any direct UTC dates by using UTC start of day with 5hr offset buffer
      const utcMidnight = Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      gte = new Date(utcMidnight - 5 * 60 * 60 * 1000);
    } else {
      const parsed = new Date(sStr);
      if (!isNaN(parsed.getTime())) gte = parsed;
    }
  }

  if (eStr && eStr !== "ALL" && eStr !== "null" && eStr !== "undefined") {
    const cleanEnd = eStr.split("T")[0];
    const parts = cleanEnd.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // End of day: 23:59:59.999 UTC or 23:59:59.999 PKT
      // Using UTC 23:59:59.999 guarantees we include all events recorded up to midnight in both UTC & PKT
      const utcEnd = Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      lte = new Date(utcEnd);
    } else {
      const parsed = new Date(eStr);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        lte = parsed;
      }
    }
  }

  // Gracefully handle inverted range if user picked Start > End
  if (gte && lte && gte.getTime() > lte.getTime()) {
    const temp = gte;
    gte = lte;
    lte = temp;
  }

  return { gte, lte };
}
