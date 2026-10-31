import "server-only";
import type { AppNotification, CalendarEvent, DiaryEntry, FoodEntry, GiftSummary, Letter, Room, ScrapEntry, WaterEntry } from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export const roomFromRow = (r: Row): Room => ({ ...(r.data as Room), id: r.id, name: r.name, kind: r.kind, createdAt: r.created_at, updatedAt: r.updated_at });
export const roomToRow = (room: Room, userId: string) => ({
  id: room.id,
  user_id: userId,
  name: room.name,
  kind: room.kind,
  data: { ...room },
  created_at: room.createdAt,
  updated_at: new Date().toISOString(),
});

export const foodFromRow = (r: Row): FoodEntry => ({
  id: r.id, date: r.entry_date, time: r.entry_time, meal: r.meal, name: r.name, portion: r.portion, calories: r.calories, notes: r.notes, source: r.source, createdAt: r.created_at,
});
export const foodToRow = (e: FoodEntry, userId: string) => ({
  id: e.id, user_id: userId, entry_date: e.date, entry_time: e.time, meal: e.meal, name: e.name, portion: e.portion, calories: e.calories, notes: e.notes, source: e.source, created_at: e.createdAt,
});

export const waterFromRow = (r: Row): WaterEntry => ({ id: r.id, date: r.entry_date, time: r.entry_time, amountMl: r.amount_ml, createdAt: r.created_at });
export const waterToRow = (e: WaterEntry, userId: string) => ({ id: e.id, user_id: userId, entry_date: e.date, entry_time: e.time, amount_ml: e.amountMl, created_at: e.createdAt });

export const diaryFromRow = (r: Row): DiaryEntry => ({ date: r.entry_date, text: r.text, mood: r.mood, updatedAt: r.updated_at });
export const diaryToRow = (e: DiaryEntry, userId: string) => ({ user_id: userId, entry_date: e.date, text: e.text, mood: e.mood, updated_at: new Date().toISOString() });

export const eventFromRow = (r: Row): CalendarEvent => ({ id: r.id, date: r.event_date, title: r.title, kind: r.kind, emoji: r.emoji, notes: r.notes });
export const eventToRow = (e: CalendarEvent, userId: string) => ({ id: e.id, user_id: userId, event_date: e.date, title: e.title, kind: e.kind, emoji: e.emoji, notes: e.notes });

export const scrapFromRow = (r: Row): ScrapEntry => ({
  id: r.id, kind: r.kind, title: r.title, body: r.body, emoji: r.emoji, color: r.color, image: r.image, room: r.room, date: r.entry_date, createdAt: r.created_at,
});
export const scrapToRow = (e: ScrapEntry, userId: string) => ({
  id: e.id, user_id: userId, kind: e.kind, title: e.title, body: e.body, emoji: e.emoji, color: e.color, image: e.image, room: e.room, entry_date: e.date, created_at: e.createdAt,
});

export const notifFromRow = (r: Row): AppNotification => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, readAt: r.read_at, createdAt: r.created_at });

export const letterFromRow = (r: Row): Letter => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, deliverAt: r.deliver_at, openedAt: r.opened_at });

/** Gift summary for the recipient. Never includes a code or a code id. */
export const giftFromRow = (r: Row): GiftSummary => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  message: r.message,
  animation: r.animation,
  hasCode: r.kind === "robux" && !!r.reward_code_id,
  status: r.status,
  sentAt: r.sent_at,
  openedAt: r.opened_at,
  revealedAt: r.revealed_at,
});

export const GIFT_COLUMNS = "id, kind, title, message, animation, reward_code_id, status, sent_at, opened_at, revealed_at";
