import { LayoutDashboard, ListOrdered, Upload, Wallet, Notebook, BarChart3, Settings, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primaryOnMobile: boolean;
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, primaryOnMobile: true },
  { href: "/trades", label: "Trades", icon: ListOrdered, primaryOnMobile: true },
  { href: "/import", label: "Import", icon: Upload, primaryOnMobile: true },
  { href: "/accounts", label: "Accounts", icon: Wallet, primaryOnMobile: true },
  { href: "/notebook", label: "Notebook", icon: Notebook, primaryOnMobile: false },
  { href: "/reports", label: "Reports", icon: BarChart3, primaryOnMobile: false },
  { href: "/settings", label: "Settings", icon: Settings, primaryOnMobile: false },
];

export const MOBILE_MORE: NavItem = {
  href: "#more",
  label: "More",
  icon: MoreHorizontal,
  primaryOnMobile: true,
};
