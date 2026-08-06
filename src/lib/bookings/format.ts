import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";

export function formatManilaDate(value: string): string {
  return DateTime.fromISO(value, { setZone: true }).setZone(TIMEZONE).toFormat("DDD");
}

export function formatManilaTime(value: string): string {
  return DateTime.fromISO(value, { setZone: true }).setZone(TIMEZONE).toFormat("h:mm a");
}

export function formatManilaDateTime(value: string): string {
  return DateTime.fromISO(value, { setZone: true }).setZone(TIMEZONE).toFormat("DDD 'at' h:mm a");
}

export function formatPeso(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}
