"use client";

import Link from "next/link";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";

const FR = [
  ["Qui est responsable ?", "Ce monde est un cadeau personnel préparé par Ewan pour Isabelle. Ewan est responsable des données au sens du RGPD. Il n’y a ni publicité, ni revente, ni partage avec d’autres utilisateurs."],
  ["Quelles données ?", "Ton prénom, le nom de ton monde, tes réglages et thèmes, tes pièces, ton journal (repas, eau, petits mots, humeur), ton album, ta progression de jeu, tes notifications et, si tu les actives, l’adresse technique de notifications push de ton appareil."],
  ["Données de santé", "Le journal repas et l’hydratation sont facultatifs et considérés comme sensibles : ils ne sont visibles que par toi, ne sont jamais partagés, jamais envoyés dans une notification, et ne servent à aucune récompense."],
  ["Où sont-elles ?", "En mode appareil : uniquement dans ton navigateur. En mode en ligne : dans une base de données Supabase (région UE recommandée) protégée par une sécurité par ligne (Row Level Security) — seul ton compte peut lire tes données."],
  ["Recherche d’aliments", "Si tu utilises la recherche, seuls les mots tapés sont envoyés à Open Food Facts (base libre). Aucune donnée personnelle n’est transmise."],
  ["Codes cadeaux", "Les codes Robux qu’Ewan t’envoie sont chiffrés (AES-256-GCM) sur le serveur et ne sont jamais stockés en clair, ni dans ton navigateur, ni dans les journaux."],
  ["Tes droits", "Tu peux à tout moment exporter toutes tes données (Réglages → Exporter) ou tout supprimer définitivement (Réglages → Supprimer). Tu peux aussi demander à Ewan l’accès, la rectification ou la suppression, et saisir la CNIL si besoin."],
  ["Conservation", "Tes données restent tant que ton monde existe. La suppression de ton compte efface tout (suppression en cascade)."],
];
const EN = [
  ["Who is responsible?", "This world is a personal gift prepared by Ewan for Isabelle. Ewan is the data controller under GDPR. No ads, no selling, no sharing with other users."],
  ["What data?", "Your first name, world name, settings and themes, rooms, diary (meals, water, notes, mood), scrapbook, game progress, notifications and, if you turn them on, your device's technical push address."],
  ["Health data", "The food and water diaries are optional and treated as sensitive: only you can see them, they are never shared, never sent in a notification, and never used for rewards."],
  ["Where is it stored?", "In device mode: only in your browser. Online: in a Supabase database (EU region recommended) protected by Row Level Security — only your account can read your data."],
  ["Food search", "If you use food search, only the words you type are sent to Open Food Facts (open database). No personal data is sent."],
  ["Gift codes", "Robux codes Ewan sends you are encrypted (AES-256-GCM) on the server and never stored in plain text, in your browser, or in logs."],
  ["Your rights", "You can export all your data at any time (Settings → Export) or delete everything permanently (Settings → Delete). You can also ask Ewan for access, correction or deletion, and contact the CNIL if needed."],
  ["Retention", "Your data stays as long as your world exists. Deleting your account erases everything (cascade deletion)."],
];

export default function PrivacyPage() {
  const { t, lang } = useT();
  const status = useWorld((s) => s.status);
  const rows = lang === "fr" ? FR : EN;
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href={status === "ready" ? "/settings" : "/"} className="btn btn-ghost btn-sm">← {t("common.back")}</Link>
      <h1 className="logo-type mt-4 text-4xl">🔒 {t("privacy.title")}</h1>
      <p className="mt-2 text-lg">{t("privacy.intro")}</p>
      <div className="mt-6 space-y-3">
        {rows.map(([h, p]) => (
          <section key={h} className="card p-5">
            <h2 className="title relative z-[1] text-lg">{h}</h2>
            <p className="relative z-[1] mt-1 leading-relaxed">{p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
