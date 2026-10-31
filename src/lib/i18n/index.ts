import { fr } from "./fr";
import { en } from "./en";
import type { Lang } from "../types";

type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? string[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof fr>;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends string[]
      ? never
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

type Lists<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends string[]
      ? `${P}${K}`
      : Lists<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dictionary>;
export type TListKey = Lists<Dictionary>;
export type TParams = Record<string, string | number>;

export const DICTIONARIES: Record<Lang, Dictionary> = { fr, en };
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "en", label: "English", flag: "🇬🇧" },
];
export const DEFAULT_LANG: Lang = "fr";

function lookup(dict: unknown, key: string): unknown {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else return undefined;
  }
  return cur;
}

export function interpolate(s: string, params?: TParams): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

export function translate(lang: Lang, key: string, params?: TParams): string {
  const v = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key);
  return typeof v === "string" ? interpolate(v, params) : key;
}

export function translateList(lang: Lang, key: string): string[] {
  const v = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key);
  return Array.isArray(v) ? (v as string[]) : [];
}

export function makeT(lang: Lang) {
  const t = (key: TKey, params?: TParams) => translate(lang, key, params);
  /** Dynamic key (e.g. built from an id). Falls back to the key itself. */
  const td = (key: string, params?: TParams) => translate(lang, key, params);
  const tl = (key: TListKey) => translateList(lang, key);
  return { t, td, tl, lang };
}

export type Translator = ReturnType<typeof makeT>;
