/**
 * Parses date inputs from user query params safely handling timezone differences.
 * E.g., '2026-10-08' on a Pakistani user's machine (UTC+5) refers to the day spanning
 * 2026-10-07 19:00:00 UTC to 2026-10-08 19:00:00 UTC.
 * To ensure queries match all records for that day regardless of local/UTC offset:
 * - Start date begins at 00:00:00 local time
 * - End date covers up to 23:59:59.999 local time
 */
export function parseDateFilter(startDateStr?: string | null, endDateStr?: string | null) {
  let gte: Date | undefined = undefined;
  let lte: Date | undefined = undefined;

  if (startDateStr) {
    // If only YYYY-MM-DD
    const cleanStart = startDateStr.split("T")[0];
    const parts = cleanStart.split("-").map(Number);
    if (parts.length === 3) {
      // Create local date start of day
      const d = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      gte = d;
    } else {
      gte = new Date(startDateStr);
    }
  }

  if (endDateStr) {
    const cleanEnd = endDateStr.split("T")[0];
    const parts = cleanEnd.split("-").map(Number);
    if (parts.length === 3) {
      // Create local date end of day
      const d = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      lte = d;
    } else {
      lte = new Date(endDateStr);
    }
  }

  return { gte, lte };
}
