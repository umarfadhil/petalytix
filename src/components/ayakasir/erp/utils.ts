export function formatRupiah(amount: number): string {
  return "Rp" + Math.abs(amount).toLocaleString("id-ID");
}

export function formatDate(timestamp: number, locale: string = "id"): string {
  return new Date(timestamp).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: number, locale: string = "id"): string {
  return new Date(timestamp).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQty(qty: number, unit: string): string {
  // unit is the stored display unit (kg/L/g/mL/pcs); current_qty is in that unit.
  return `${parseFloat(qty.toFixed(3))} ${unit}`;
}

export function todayRange(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000 - 1;
  return [start, end];
}

export function monthRange(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return [start, end];
}

export function yearRange(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
  return [start, end];
}
