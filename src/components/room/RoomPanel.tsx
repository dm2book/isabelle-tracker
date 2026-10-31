"use client";

import { Lock } from "lucide-react";
import type { Room, RoomSize, Surface } from "@/lib/types";
import { SURFACES, type SurfaceUse } from "@/lib/catalog/surfaces";
import { isUnlocked, uid } from "@/lib/catalog";
import { useWorld } from "@/store/world";
import { useFavoriteColors } from "@/store/selectors";
import { useT } from "@/lib/i18n/use";
import { ColorField, Seg } from "@/components/ui/bits";
import { SurfacePreview } from "./ItemPreview";

function SurfacePicker({ use, value, onChange, title }: { use: SurfaceUse; value: Surface; onChange: (s: Surface) => void; title: string }) {
  const { t, td } = useT();
  const owned = useWorld((s) => s.game.owned);
  const palette = useFavoriteColors();
  const gameAction = useWorld((s) => s.gameAction);
  const options = SURFACES.filter((s) => s.use.includes(use));
  return (
    <div className="space-y-3">
      <p className="title">{title}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {options.map((s) => {
          const unlocked = isUnlocked(uid("surface", s.id), owned);
          const active = value.pattern === s.id;
          return (
            <button
              key={s.id}
              onClick={async () => {
                if (!unlocked) {
                  const r = await gameAction({ type: "buy", uid: uid("surface", s.id) });
                  if (!r) return;
                }
                onChange({ pattern: s.id, c1: active ? value.c1 : s.c1, c2: active ? value.c2 : s.c2 });
              }}
              className={`relative overflow-hidden rounded-xl border-[3px] text-[0.68rem] font-bold ${active ? "border-ink" : "border-line"}`}
              aria-pressed={active}
              aria-label={`${td(`surfaces.${s.id}`)}${unlocked ? "" : ` — ${s.price}`}`}
            >
              <span className="block h-12"><SurfacePreview pattern={s.id} c1={active ? value.c1 : s.c1} c2={active ? value.c2 : s.c2} id={`${use}-${s.id}`} /></span>
              <span className="block truncate bg-surface px-1 py-0.5">{td(`surfaces.${s.id}`)}</span>
              {!unlocked && <span className="absolute top-1 left-1 flex items-center gap-0.5 rounded-full bg-surface px-1 text-[0.6rem]"><Lock size={9} />{s.price}</span>}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ColorField label={t("editor.color1")} value={value.c1} onChange={(c) => onChange({ ...value, c1: c })} swatches={palette} />
        <ColorField label={t("editor.color2")} value={value.c2} onChange={(c) => onChange({ ...value, c2: c })} swatches={palette} />
      </div>
    </div>
  );
}

export function RoomPanel({ room, onChange }: { room: Room; onChange: (r: Room) => void }) {
  const { t } = useT();
  return (
    <div className="space-y-6">
      <label className="block">
        <span className="label">{t("common.name")}</span>
        <input className="field" value={room.name} maxLength={40} onChange={(e) => onChange({ ...room, name: e.target.value })} />
      </label>
      <div>
        <span className="label">{t("rooms.size")}</span>
        <Seg<RoomSize>
          value={room.size}
          onChange={(size) => onChange({ ...room, size })}
          options={(["cozy", "standard", "grand"] as RoomSize[]).map((s) => ({ id: s, label: t(`rooms.sizes.${s}`) }))}
        />
      </div>
      <SurfacePicker use={room.outdoor ? "sky" : "wall"} title={room.outdoor ? t("editor.sky") : t("editor.wall")} value={room.wall} onChange={(wall) => onChange({ ...room, wall })} />
      <SurfacePicker use={room.outdoor ? "ground" : "floor"} title={room.outdoor ? t("editor.ground") : t("editor.floor")} value={room.floor} onChange={(floor) => onChange({ ...room, floor })} />
    </div>
  );
}
