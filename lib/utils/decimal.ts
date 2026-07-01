import { Decimal } from "decimal.js";

/**
 * Safe decimal operations untuk perhitungan keuangan
 * Menghindari floating point precision errors
 */

export function toDecimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

export function addDecimal(...values: (string | number | Decimal)[]): Decimal {
  return values.reduce(
    (sum, val) => sum.add(toDecimal(val)),
    new Decimal(0)
  );
}

export function subtractDecimal(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function multiplyDecimal(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function divideDecimal(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).dividedBy(toDecimal(b));
}

export function formatCurrency(value: string | number | Decimal): string {
  const decimal = toDecimal(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(decimal.toNumber());
}

export function formatDecimal(value: string | number | Decimal, decimalPlaces: number = 2): string {
  return toDecimal(value).toFixed(decimalPlaces);
}

export function isPositive(value: string | number | Decimal): boolean {
  return toDecimal(value).greaterThan(0);
}

export function isZero(value: string | number | Decimal): boolean {
  return toDecimal(value).equals(0);
}

export function compareDecimal(a: string | number | Decimal, b: string | number | Decimal): number {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  
  if (decimalA.greaterThan(decimalB)) return 1;
  if (decimalA.lessThan(decimalB)) return -1;
  return 0;
}
