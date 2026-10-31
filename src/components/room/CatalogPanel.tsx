"use client";

import { useMemo, useState } from "react";
import { Search, Star, Lock } from "lucide-react";
import { CATEGORIES, ITEMS, type Category, type ItemDef } from "@/lib/catalog/furniture";
import { isUnlocked, uid } from "@/lib/catalog";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { ItemPreview } from "./ItemPreview";
import { currentSeason } from "@/lib/seasons";
import { dateKey } from "@/lib/time";

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function CatalogPanel({ onPick }: { onPick: (item: ItemDef) => void }) {
  const { t, td, lang } = useT();
  const owned = useWorld((s) => s.game.owned);
  const coins = useWorld((s) => s.game.coins);
  const favorites = useWorld((s) => s.prefs.favoriteItems);
  const tz = useWorld((s) => s.prefs.timezone);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const gameAction = useWorld((s) => s.gameAction);
  const season = currentSeason(dateKey(new Date(), tz));
  const [cat, setCat] = useState<Category | "fav" | "all">(season ? "seasonal" : "all");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<ItemDef | null>(null);

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    return ITEMS.filter((i) => {
      if (cat === "fav" && !favorites.includes(i.id)) return false;
      if (cat !== "fav" && cat !== "all" && i.cat !== cat) return false;
      if (!nq) return true;
      return normalize(`${i.name.fr} ${i.name.en} ${i.tags}`).includes(nq);
    }).sort((a, b) => {
      const sa = season && a.season === season.id ? -1 : 0;
      const sb = season && b.season === season.id ? -1 : 0;
      return sa - sb;
    });
  }, [cat, q, favorites, season]);

  const toggleFav = (id: string) =>
    updatePrefs((p) => ({ ...p, favoriteItems: p.favoriteItems.includes(id) ? p.favoriteItems.filter((x) => x !== id) : [...p.favoriteItems, id] }));

  const buy = async (item: ItemDef) => {
    const r = await gameAction({ type: "buy", uid: uid("item", item.id) });
    setConfirm(null);
    if (r) onPick(item);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <label className="relative block">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <input className="field pl-10" placeholder={t("editor.searchItems")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("common.search")} />
      </label>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
        {(["all", "fav"] as const).map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`chip shrink-0 ${cat === c ? "bg-primary text-on-primary" : ""}`}>
            {c === "all" ? `✨ ${t("common.all")}` : `⭐ ${t("editor.favorites")}`}
          </button>
        ))}
        {CATEGORIES.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`chip shrink-0 ${cat === c.id ? "bg-primary text-on-primary" : ""}`}>
            {c.emoji} {td(`catalog.cats.${c.id}`)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-6 text-center text-muted">{t("editor.noResults")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-2 sm:grid-cols-4 lg:grid-cols-3">
          {list.map((item) => {
            const unlocked = isUnlocked(uid("item", item.id), owned);
            const fav = favorites.includes(item.id);
            const inSeason = season && item.season === season.id;
            return (
              <div key={item.id} className="card-flat relative flex flex-col items-center p-2">
                <button
                  className="flex w-full flex-col items-center gap-1 text-center"
                  onClick={() => (unlocked ? onPick(item) : setConfirm(item))}
                  aria-label={`${item.name[lang]}${unlocked ? "" : ` — ${t("common.locked")} ${item.price}`}`}
                >
                  <span className={`grid h-16 w-16 place-items-center ${unlocked ? "" : "opacity-50 grayscale-[40%]"}`}>
                    <ItemPreview id={item.id} size={60} />
                  </span>
                  <span className="line-clamp-2 text-[0.72rem] leading-tight font-bold">{item.name[lang]}</span>
                </button>
                {!unlocked && (
                  <span className="absolute top-1 left-1 flex items-center gap-0.5 rounded-full bg-surface px-1.5 py-0.5 text-[0.65rem] font-bold">
                    <Lock size={10} /> {item.price}
                  </span>
                )}
                {inSeason && <span className="absolute top-1 left-1 text-xs" aria-hidden>{season?.emoji}</span>}
                <button onClick={() => toggleFav(item.id)} aria-label={t("editor.favorites")} aria-pressed={fav} className="absolute top-0.5 right-0.5 grid h-7 w-7 place-items-center">
                  <Star size={14} className={fav ? "fill-[#FFD45E] text-[#E0A800]" : "text-muted"} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {confirm && (
        <div className="card-flat flex flex-wrap items-center gap-2 p-3">
          <ItemPreview id={confirm.id} size={44} />
          <p className="min-w-0 flex-1 text-sm font-bold">{t("inventory.buyConfirm", { name: confirm.name[lang], price: confirm.price })}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>{t("common.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={coins < confirm.price} onClick={() => buy(confirm)}>🪙 {confirm.price}</button>
          {coins < confirm.price && <p className="w-full text-xs text-muted">{t("inventory.notEnough")}</p>}
        </div>
      )}
    </div>
  );
}
