import { format, addDays, differenceInDays, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";

export function formatDate(date: Date | string, formatStr: string = "dd MMM yyyy"): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: id });
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "dd MMM yyyy HH:mm", { locale: id });
}

export function addDaysToDate(date: Date | string, days: number): Date {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return addDays(dateObj, days);
}

export function getDaysDifference(dateA: Date | string, dateB: Date | string): number {
  const dateObjA = typeof dateA === "string" ? parseISO(dateA) : dateA;
  const dateObjB = typeof dateB === "string" ? parseISO(dateB) : dateB;
  return differenceInDays(dateObjA, dateObjB);
}

export function isExpiringSoon(expiryDate: Date | string, warningDays: number = 7): boolean {
  const expiryDateObj = typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate;
  const today = startOfDay(new Date());
  const daysUntilExpiry = differenceInDays(expiryDateObj, today);
  return daysUntilExpiry >= 0 && daysUntilExpiry <= warningDays;
}

export function isExpired(expiryDate: Date | string): boolean {
  const expiryDateObj = typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate;
  return isBefore(endOfDay(expiryDateObj), new Date());
}

export function isDateAfter(dateA: Date | string, dateB: Date | string): boolean {
  const dateObjA = typeof dateA === "string" ? parseISO(dateA) : dateA;
  const dateObjB = typeof dateB === "string" ? parseISO(dateB) : dateB;
  return isAfter(dateObjA, dateObjB);
}

export function getYearMonth(): string {
  return format(new Date(), "yyyy-MM");
}
