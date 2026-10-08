/**
 * Currency and Number Formatting Utility for Pakistan POS
 * Formats currency values with thousands commas (e.g., Rs. 25,000)
 * Avoids cluttered unnecessary decimals (.00) when the number is a whole integer.
 * If there are cents/fractions (e.g. 25.5), displays maximum 2 clean decimal places.
 */

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  // Check if it has real decimal fractions (e.g. 1250.50 vs 1250)
  const isFractional = Math.abs(num % 1) > 0.001;

  return num.toLocaleString("en-PK", {
    minimumFractionDigits: isFractional ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(value: number | string | null | undefined, prefix = "Rs. "): string {
  return `${prefix}${formatNumber(value)}`;
}
