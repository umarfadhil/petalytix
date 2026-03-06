export const SIM_USERNAME = "ayakasir";
export const SIM_PASSWORD = "cobaduluaja";

let counter = 0;
export const genId = (): string => `sim-${Date.now()}-${++counter}`;

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatRupiah = (amount: number): string =>
  `Rp${rupiahFormatter.format(amount)}`;

export function formatQty(qty: number, unit: string): string {
  if (unit === "g" && qty >= 1000) return `${(qty / 1000).toFixed(1)} kg`;
  if (unit === "mL" && qty >= 1000) return `${(qty / 1000).toFixed(1)} L`;
  return `${qty} ${unit}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
