"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section } from "@/components/ui/bits";
import { ItemPreview, SurfacePreview } from "@/components/room/ItemPreview";
import { Companion } from "@/components/companion/Companion";
import { SHOP, isUnlocked, type Unlockable } from "@/lib/catalog";
import { ITEMS } from "@/lib/catalog/furniture";
import { SURFACE_MAP } from "@/lib/catalog/surfaces";
import { WEARABLE_MAP } from "@/lib/catalog/wardrobe";
import { BUILT_IN_THEMES } from "@/lib/theme/themes";
import { COLLECTIBLES, SET_ORDER } from "@/lib/catalog/collectibles";

type Tab = "shop" | "owned" | "collection";

function Thumb({ u }: { u: Unlockable }) {
  const look = useWorld((s) => s.prefs.companion);
  if (u.kind === "item") return <ItemPreview id={u.id} size={64} />;
  if (u.kind === "surface") {
    const s = SURFACE_MAP[u.id];
    return <span className="block h-14 w-20 overflow-hidden rounded-lg"><SurfacePreview pattern={u.id} c1={s.c1} c2={s.c2} id={`shop-${u.id}`} /></span>;
  }
  if (u.kind === "wear") {
    const w = WEARABLE_MAP[u.id];
    return <Companion look={{ ...look, outfit: w?.kind === "outfit" ? u.id : null, accessory: w?.kind === "accessory" ? u.id : null, outfitColor: w?.color ?? null }} size={60} still />;
  }
  const th = BUILT_IN_THEMES.find((x) => x.id === u.id)!;
  return <span className="block h-14 w-20 rounded-lg" style={{ background: `linear-gradient(135deg, ${th.dark.bg}, ${th.light.primary})` }} />;
}

export default function InventoryPage() {
  const { t, td, lang } = useT();
  const game = useWorld((s) => s.game);
  const gameAction = useWorld((s) => s.gameAction);
  const [tab, setTab] = useState<Tab>("shop");
  const [confirm, setConfirm] = useState<Unlockable | null>(null);
  const forSale = SHOP.filter((u) => !isUnlocked(u.uid, game.owned));
  const ownedPaid = SHOP.filter((u) => game.owned.includes(u.uid));
  const freeCount = ITEMS.filter((i) => i.price === 0).length;
  const nameOf = (u: Unlockable) => (u.kind === "surface" ? td(`surfaces.${u.id}`) : u.name(lang));

  return (
    <div className="space-y-4">
      <PageHeader title={t("inventory.title")} subtitle={t("inventory.subtitle")} emoji="🧺" action={<span className="chip text-base">🪙 {game.coins}</span>} />
      <div className="seg">
        {(["shop", "owned", "collection"] as Tab[]).map((x) => <button key={x} aria-pressed={tab === x} onClick={() => setTab(x)}>{t(`inventory.tabs.${x}`)}</button>)}
      </div>

      {tab === "shop" && (
        <>
          <p className="text-sm text-muted">🎀 {t("inventory.freeItems")} ({freeCount}+)</p>
          {forSale.length === 0 ? (
            <div className="card p-6 text-center"><p className="relative z-[1] font-bold">{t("inventory.allOwned")}</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {forSale.map((u) => (
                <button key={u.uid} onClick={() => setConfirm(u)} className="card flex flex-col items-center gap-2 p-3 text-center">
                  <span className="relative z-[1] grid h-20 place-items-center"><Thumb u={u} /></span>
                  <span className="relative z-[1] line-clamp-2 text-sm font-bold">{nameOf(u)}</span>
                  <span className={`chip relative z-[1] ${game.coins >= u.price ? "bg-primary text-on-primary" : ""}`}>🪙 {u.price}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "owned" && (
        <Section>
          {ownedPaid.length === 0 ? (
            <p className="text-sm text-muted">{t("inventory.freeItems")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {ownedPaid.map((u) => (
                <div key={u.uid} className="card-flat flex flex-col items-center gap-1 p-2 text-center">
                  <span className="grid h-16 place-items-center"><Thumb u={u} /></span>
                  <span className="text-xs font-bold">{nameOf(u)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/rooms" className="btn btn-soft btn-sm">🛋️ {t("nav.rooms")}</Link>
            <Link href="/companion" className="btn btn-soft btn-sm">👗 {t("inventory.tabs.outfits")}</Link>
            <Link href="/studio" className="btn btn-soft btn-sm">🎨 {t("nav.studio")}</Link>
          </div>
        </Section>
      )}

      {tab === "collection" && (
        <div className="space-y-4">
          <p className="title text-lg">📚 {t("inventory.collectionBook")}</p>
          {SET_ORDER.map((set) => {
            const items = COLLECTIBLES.filter((c) => c.set === set);
            const found = items.filter((c) => game.collectibles[c.id]).length;
            return (
              <Section key={set} title={td(`collectibles.sets.${set}`)} action={<span className="chip">{t("inventory.found", { n: found, t: items.length })}</span>}>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {items.map((c) => {
                    const n = game.collectibles[c.id] ?? 0;
                    return (
                      <div key={c.id} className={`card-flat relative flex flex-col items-center p-2 text-center ${n ? "" : "opacity-60"}`} title={n ? c.name[lang] : t("inventory.undiscovered")}>
                        <span className={`text-3xl ${n ? "" : "blur-[3px] grayscale"}`} aria-hidden>{c.emoji}</span>
                        <span className="text-[0.7rem] font-bold">{n ? c.name[lang] : "???"}</span>
                        {n > 1 && <span className="absolute top-1 right-1 rounded-full bg-primary px-1.5 text-[0.65rem] font-bold text-on-primary">×{n}</span>}
                        <span className={`mt-0.5 text-[0.6rem] font-bold uppercase ${c.rarity === "legendary" ? "text-[#C58A00]" : c.rarity === "epic" ? "text-[#8A5CE6]" : "text-muted"}`}>{c.rarity}</span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.25rem)] z-50 flex justify-center px-4 lg:bottom-6">
          <div className="card flex max-w-md flex-wrap items-center gap-3 p-4">
            <span className="relative z-[1]"><Thumb u={confirm} /></span>
            <p className="relative z-[1] min-w-0 flex-1 font-bold">{t("inventory.buyConfirm", { name: nameOf(confirm), price: confirm.price })}</p>
            {game.coins < confirm.price && <p className="relative z-[1] w-full text-sm text-muted">{t("inventory.notEnough")}</p>}
            <div className="relative z-[1] flex w-full justify-end gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>{t("common.cancel")}</button>
              <button className="btn btn-primary btn-sm" disabled={game.coins < confirm.price} onClick={async () => { await gameAction({ type: "buy", uid: confirm.uid }); setConfirm(null); }}>🪙 {t("common.unlock")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
