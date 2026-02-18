/**
 * Format cents to a currency string (e.g., 10000 -> "$100.00")
 */
export function formatCurrency(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Format a date to a readable string (e.g., "Jan 15, 2025")
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format a date to ISO date string (e.g., "2025-01-15")
 */
export function formatDateISO(date: Date | string): string {
  return new Date(date).toISOString().split("T")[0];
}
