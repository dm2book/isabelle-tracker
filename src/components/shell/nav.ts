import {
  Home, Map, Sofa, Palette, Cat, Apple, GlassWater, CalendarHeart, Star, Package, Gift, BookHeart, Settings, Bell, Shield,
  type LucideIcon,
} from "lucide-react";
import type { TKey } from "@/lib/i18n";

export interface NavItem {
  id: string;
  href: string;
  label: TKey;
  emoji: string;
  icon: LucideIcon;
  group: "play" | "care" | "magic" | "system";
}

export const NAV: NavItem[] = [
  { id: "home", href: "/home", label: "nav.home", emoji: "🏠", icon: Home, group: "play" },
  { id: "world", href: "/world", label: "nav.world", emoji: "🌍", icon: Map, group: "play" },
  { id: "rooms", href: "/rooms", label: "nav.rooms", emoji: "🛋️", icon: Sofa, group: "play" },
  { id: "studio", href: "/studio", label: "nav.studio", emoji: "🎨", icon: Palette, group: "play" },
  { id: "companion", href: "/companion", label: "nav.companion", emoji: "🐱", icon: Cat, group: "play" },
  { id: "food", href: "/food", label: "nav.food", emoji: "🍓", icon: Apple, group: "care" },
  { id: "water", href: "/water", label: "nav.water", emoji: "💧", icon: GlassWater, group: "care" },
  { id: "calendar", href: "/calendar", label: "nav.calendar", emoji: "📅", icon: CalendarHeart, group: "care" },
  { id: "scrapbook", href: "/scrapbook", label: "nav.scrapbook", emoji: "📖", icon: BookHeart, group: "care" },
  { id: "quests", href: "/quests", label: "nav.quests", emoji: "⭐", icon: Star, group: "magic" },
  { id: "inventory", href: "/inventory", label: "nav.inventory", emoji: "🧺", icon: Package, group: "magic" },
  { id: "surprises", href: "/surprises", label: "nav.surprises", emoji: "🎁", icon: Gift, group: "magic" },
  { id: "notifications", href: "/notifications", label: "nav.notifications", emoji: "🔔", icon: Bell, group: "system" },
  { id: "settings", href: "/settings", label: "nav.settings", emoji: "⚙️", icon: Settings, group: "system" },
];

export const ADMIN_ITEM: NavItem = { id: "admin", href: "/admin", label: "nav.admin", emoji: "🛡️", icon: Shield, group: "system" };

export const BOTTOM: string[] = ["home", "world", "surprises", "quests"];

export const GROUPS: { id: NavItem["group"]; label: TKey }[] = [
  { id: "play", label: "nav.play" },
  { id: "care", label: "nav.care" },
  { id: "magic", label: "nav.magic" },
  { id: "system", label: "nav.settings" },
];
