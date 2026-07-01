export function formatCurrency(amount: number, currency = "PEN"): string {
  const symbol = currency === "USD" ? "US$" : "S/";
  return `${symbol} ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-PE");
}
