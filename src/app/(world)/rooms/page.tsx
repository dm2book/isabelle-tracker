"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Empty } from "@/components/ui/bits";
import { RoomThumb } from "@/components/room/RoomCanvas";
import { CreateRoomSheet } from "@/components/room/CreateRoomSheet";
import { newId, uuid } from "@/lib/rooms/layout";
import type { Room } from "@/lib/types";

export default function RoomsPage() {
  const { t } = useT();
  const rooms = useWorld((s) => s.rooms);
  const saveRoom = useWorld((s) => s.saveRoom);
  const deleteRoom = useWorld((s) => s.deleteRoom);
  const [open, setOpen] = useState(false);

  const duplicate = (r: Room) => {
    const now = new Date().toISOString();
    saveRoom({ ...r, id: uuid(), name: `${r.name} ✨`, secret: undefined, objects: r.objects.map((o) => ({ ...o, id: newId() })), createdAt: now, updatedAt: now }, { immediate: true });
  };
  const rename = (r: Room) => {
    const name = prompt(t("rooms.renamePrompt"), r.name);
    if (name && name.trim()) saveRoom({ ...r, name: name.trim().slice(0, 40) }, { immediate: true });
  };

  return (
    <div>
      <PageHeader title={t("rooms.title")} subtitle={t("rooms.subtitle")} emoji="🛋️" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> {t("rooms.create")}</button>} />
      {rooms.length === 0 ? (
        <div className="card"><Empty emoji="🏠" text={t("rooms.empty")} action={<button className="btn btn-primary" onClick={() => setOpen(true)}>{t("rooms.create")}</button>} /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <article key={r.id} className="card p-3">
              <div className="relative z-[1]">
                <Link href={`/rooms/${r.id}?view=1`} aria-label={`${t("rooms.view")} ${r.name}`}><RoomThumb room={r} /></Link>
                <div className="mt-2 flex items-start gap-2 px-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="title truncate">{r.emoji} {r.name}</h2>
                    <p className="text-xs font-bold text-muted">{t("rooms.objects", { count: r.objects.length })}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link href={`/rooms/${r.id}`} className="btn btn-primary btn-sm"><Pencil size={16} /> {t("rooms.edit")}</Link>
                  <Link href={`/rooms/${r.id}?view=1`} className="btn btn-soft btn-sm"><Eye size={16} /> {t("rooms.view")}</Link>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => rename(r)} aria-label={t("common.rename")}>✏️</button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => duplicate(r)} aria-label={t("common.duplicate")}><Copy size={16} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => confirm(t("rooms.deleteConfirm", { name: r.name })) && deleteRoom(r.id)} aria-label={t("common.delete")}><Trash2 size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <CreateRoomSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
