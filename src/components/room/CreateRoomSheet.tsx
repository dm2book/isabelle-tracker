"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Seg } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { buildRoom } from "@/lib/rooms/templates";
import { KIND_EMOJI, newId, uuid } from "@/lib/rooms/layout";
import type { Room, RoomKind, RoomSize } from "@/lib/types";

const KINDS: RoomKind[] = ["bedroom", "cafe", "reading", "gaming", "living", "garden", "island", "custom"];

export function CreateRoomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useT();
  const saveRoom = useWorld((s) => s.saveRoom);
  const presets = useWorld((s) => s.prefs.roomPresets);
  const router = useRouter();
  const [kind, setKind] = useState<RoomKind>("bedroom");
  const [size, setSize] = useState<RoomSize>("standard");
  const [start, setStart] = useState<"template" | "blank" | string>("template");
  const [name, setName] = useState("");

  const create = () => {
    let room: Room;
    const preset = presets.find((p) => p.id === start);
    if (preset) {
      const now = new Date().toISOString();
      room = { ...preset.room, objects: preset.room.objects.map((o) => ({ ...o, id: newId() })), id: uuid(), name: name.trim() || preset.name, createdAt: now, updatedAt: now };
    } else {
      room = buildRoom(kind, size, lang, start === "blank" || kind === "custom", name.trim() || undefined);
    }
    saveRoom(room, { immediate: true });
    onClose();
    router.push(`/rooms/${room.id}`);
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("rooms.createTitle")} footer={<button className="btn btn-primary" onClick={create}>✨ {t("common.create")}</button>}>
      <div className="space-y-5">
        <label className="block">
          <span className="label">{t("common.name")}</span>
          <input className="field" value={name} maxLength={40} placeholder={t(`rooms.kinds.${kind}`)} onChange={(e) => setName(e.target.value)} />
        </label>
        <div>
          <span className="label">{t("rooms.type")}</span>
          <div className="grid grid-cols-4 gap-2">
            {KINDS.map((k) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`card-flat flex flex-col items-center gap-1 border-[3px] p-2 text-center text-[0.72rem] font-bold ${kind === k ? "border-primary" : "border-transparent"}`}>
                <span className="text-2xl" aria-hidden>{KIND_EMOJI[k]}</span>
                {t(`rooms.kinds.${k}`)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t("rooms.size")}</span>
          <Seg<RoomSize> value={size} onChange={setSize} options={(["cozy", "standard", "grand"] as RoomSize[]).map((s) => ({ id: s, label: t(`rooms.sizes.${s}`) }))} />
        </div>
        <div>
          <span className="label">{t("rooms.startFrom")}</span>
          <div className="flex flex-wrap gap-2">
            <button className={`btn btn-sm ${start === "template" ? "btn-primary" : "btn-ghost"}`} onClick={() => setStart("template")}>🎀 {t("rooms.template")}</button>
            <button className={`btn btn-sm ${start === "blank" ? "btn-primary" : "btn-ghost"}`} onClick={() => setStart("blank")}>⬜ {t("rooms.blank")}</button>
            {presets.map((p) => (
              <button key={p.id} className={`btn btn-sm ${start === p.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setStart(p.id)}>💾 {p.name}</button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
