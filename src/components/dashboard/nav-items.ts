import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Scissors,
  Users,
  CalendarClock,
  CalendarOff,
  BadgeCheck,
  CalendarCheck,
  Settings,
  Bell,
  UserCog,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** False for pages that arrive in a later phase (shown as "Soon"). */
  available: boolean;
};

/** Owner/Admin navigation (PROJECT_BRIEF.md → Dashboard Pages). */
const OWNER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, available: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, available: false },
  { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList, available: false },
  { href: "/dashboard/services", label: "Services", icon: Scissors, available: false },
  { href: "/dashboard/team", label: "Team", icon: Users, available: false },
  { href: "/dashboard/availability", label: "Availability", icon: CalendarClock, available: false },
  { href: "/dashboard/blocked-dates", label: "Blocked dates", icon: CalendarOff, available: false },
  { href: "/dashboard/payments", label: "Payments", icon: BadgeCheck, available: false },
  {
    href: "/dashboard/calendar-connections",
    label: "Google Calendar",
    icon: CalendarCheck,
    available: false,
  },
  { href: "/dashboard/settings", label: "Business settings", icon: Settings, available: false },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, available: false },
];

/** Team Member / Nail Technician navigation. */
const TECH_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, available: true },
  { href: "/dashboard/calendar", label: "My calendar", icon: CalendarDays, available: false },
  { href: "/dashboard/bookings", label: "My bookings", icon: ClipboardList, available: false },
  {
    href: "/dashboard/availability",
    label: "My availability",
    icon: CalendarClock,
    available: false,
  },
  {
    href: "/dashboard/blocked-dates",
    label: "My blocked dates",
    icon: CalendarOff,
    available: false,
  },
  {
    href: "/dashboard/calendar-connections",
    label: "Google Calendar",
    icon: CalendarCheck,
    available: false,
  },
  { href: "/dashboard/account", label: "Account", icon: UserCog, available: false },
];

export function navForRole(role: UserRole): NavItem[] {
  return role === "owner" ? OWNER_NAV : TECH_NAV;
}
