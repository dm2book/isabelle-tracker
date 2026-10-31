"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import {
  ArrowDown, ArrowUp, ChevronLeft, Copy, Eye, FlipHorizontal, Pencil, Redo2, RotateCcw, RotateCw, Shuffle, Trash2, Undo2, Wand2,
  Camera, Sofa, Paintbrush, X, Save,
} from "lucide-react";
import type { Room, RoomObject } from "@/lib/types";
import { useWorld } from "@/store/world";
import { useFavoriteColors } from "@/store/selectors";
import { useT } from "@/lib/i18n/use";
import { RoomCanvas } from "./RoomCanvas";
import { CatalogPanel } from "./CatalogPanel";
import { RoomPanel } from "./RoomPanel";
import { Sheet } from "@/components/ui/Sheet";
import { ColorField } from "@/components/ui/bits";
import { Companion } from "@/components/companion/Companion";
import { ITEM_MAP, type ItemDef } from "@/lib/catalog/furniture";
import { clampObject, dims, newId, nextZ, uuid } from "@/lib/rooms/layout";
import { generateDreamRoom, swapObject } from "@/lib/rooms/generator";
import { svgToJpeg } from "@/lib/rooms/photo";
import { dateKey } from "@/lib/time";
import { play } from "@/lib/sound";

type Snapshot = Pick<Room, "objects" | "wall" | "floor" | "size" | "name">;
type Drag =
  | { mode: "move"; id: string; dx: number; dy: number; moved: boolean }
  | { mode: "rotate"; id: string }
  | { mode: "scale"; id: string; d0: number; s0: number };

const snap = (r: Room): Snapshot => ({ objects: r.objects, wall: r.wall, floor: r.floor, size: r.size, name: r.name });

function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const m = svg.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : pt;
}

function WalkingCompanion({ width }: { width: number }) {
  const look = useWorld((s) => s.prefs.companion);
  const [dir, setDir] = useState(1);
  return (
    <motion.div
      className="pointer-events-none absolute bottom-[3%]"
      style={{ width: Math.max(70, width * 0.13) }}
      initial={{ left: "10%" }}
      animate={{ left: dir > 0 ? "78%" : "8%" }}
      transition={{ duration: 7, ease: "easeInOut" }}
      onAnimationComplete={() => setDir((d) => -d)}
    >
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ scaleX: dir }}>
        <Companion look={look} mood="happy" size={Math.max(70, width * 0.13)} still />
      </motion.div>
    </motion.div>
  );
}

export function RoomEditor({ initial, startInPreview }: { initial: Room; startInPreview?: boolean }) {
  const { t, lang } = useT();
  const saveRoom = useWorld((s) => s.saveRoom);
  const saveScrap = useWorld((s) => s.saveScrap);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const owned = useWorld((s) => s.game.owned);
  const tz = useWorld((s) => s.prefs.timezone);
  const palette = useFavoriteColors();
  const toast = useWorld((s) => s.toast);
  const track = useWorld((s) => s.track);

  const [room, setRoom] = useState<Room>(initial);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState(!!startInPreview);
  const [panel, setPanel] = useState<"catalog" | "room" | "presets" | null>(null);
  const [dream, setDream] = useState<Snapshot | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isWide, setIsWide] = useState(false);
  const [unit, setUnit] = useState(2); // logical units per screen pixel
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const roomRef = useRef(room);
  useLayoutEffect(() => {
    roomRef.current = room;
  }, [room]);
  /** Update the working copy (keeps the ref in sync immediately for rapid pointer events). */
  const apply = useCallback((next: Room) => {
    roomRef.current = next;
    setRoom(next);
  }, []);

  const { w } = dims(room);
  const sel = room.objects.find((o) => o.id === selected) ?? null;
  const selDef = sel ? ITEM_MAP[sel.item] : null;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth || 1;
      setUnit(dims(roomRef.current).w / cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [room.size]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const u = () => setIsWide(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  useEffect(() => {
    if (initial.secret) track("secret_found", "secret_room");
    else track(initial.kind === "garden" || initial.kind === "island" ? "visit_garden" : "visit_room", initial.id);
  }, [initial.id, initial.kind, initial.secret, track]);

  /** Commit a change: push history and autosave. */
  const commit = useCallback(
    (next: Room, prev: Room = roomRef.current) => {
      setPast((p) => [...p.slice(-60), snap(prev)]);
      setFuture([]);
      apply(next);
      saveRoom(next);
    },
    [saveRoom, apply],
  );

  const updateObj = (id: string, patch: Partial<RoomObject>, record = true) => {
    const cur = roomRef.current;
    const next = { ...cur, objects: cur.objects.map((o) => (o.id === id ? clampObject(cur, { ...o, ...patch }) : o)) };
    if (record) commit(next, cur);
    else apply(next);
  };

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture((f) => [snap(room), ...f]);
    const next = { ...room, ...prev };
    apply(next);
    saveRoom(next);
    setSelected(null);
  };
  const redo = () => {
    if (!future.length) return;
    const [n, ...rest] = future;
    setFuture(rest);
    setPast((p) => [...p, snap(room)]);
    const next = { ...room, ...n };
    apply(next);
    saveRoom(next);
  };

  const addItem = (item: ItemDef) => {
    const cur = roomRef.current;
    const d = dims(cur);
    const onWall = item.place === "wall";
    const y = onWall ? d.wallH * 0.7 : item.place === "floor" ? d.wallH + (d.h - d.wallH) * 0.75 : d.wallH + (d.h - d.wallH) * 0.85;
    const o: RoomObject = clampObject(cur, {
      id: newId(), item: item.id, x: d.w / 2 + (Math.random() - 0.5) * d.w * 0.2, y: Math.min(d.h - 4, y + (onWall ? item.h * 0.5 : 0)),
      s: 1, r: 0, flip: false, z: nextZ(cur.objects),
    });
    commit({ ...cur, objects: [...cur.objects, o] }, cur);
    setSelected(o.id);
    if (!isWide) setPanel(null);
    play("pop");
  };

  const remove = (id: string) => {
    const cur = roomRef.current;
    commit({ ...cur, objects: cur.objects.filter((o) => o.id !== id) }, cur);
    setSelected(null);
  };
  const duplicate = (id: string) => {
    const cur = roomRef.current;
    const o = cur.objects.find((x) => x.id === id);
    if (!o) return;
    const copy = clampObject(cur, { ...o, id: newId(), x: o.x + 40, y: o.y + 10, z: nextZ(cur.objects) });
    commit({ ...cur, objects: [...cur.objects, copy] }, cur);
    setSelected(copy.id);
  };
  const layer = (id: string, dir: 1 | -1) => {
    const cur = roomRef.current;
    const sorted = [...cur.objects].sort((a, b) => a.z - b.z);
    const i = sorted.findIndex((o) => o.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    const objects = sorted.map((o, k) => ({ ...o, z: k + 1 }));
    commit({ ...cur, objects }, cur);
  };

  // ---------- Pointer interactions ----------
  const onObjectDown = (e: RPointerEvent<SVGGElement>, o: RoomObject) => {
    if (preview || !svgRef.current) return;
    e.stopPropagation();
    setSelected(o.id);
    const p = svgPoint(svgRef.current, e);
    drag.current = { mode: "move", id: o.id, dx: p.x - o.x, dy: p.y - o.y, moved: false };
    svgRef.current.setPointerCapture(e.pointerId);
    dragStart.current = roomRef.current;
  };
  const dragStart = useRef<Room | null>(null);

  const onHandleDown = (e: RPointerEvent<SVGElement>) => {
    const mode = (e.currentTarget as SVGElement).dataset.handle as "rotate" | "scale";
    const svg = svgRef.current;
    const cur = roomRef.current.objects.find((o) => o.id === selected);
    if (!svg || !cur) return;
    e.stopPropagation();
    const p = svgPoint(svg, e);
    drag.current = mode === "rotate" ? { mode, id: cur.id } : { mode, id: cur.id, d0: Math.hypot(p.x - cur.x, p.y - cur.y) || 1, s0: cur.s };
    svg.setPointerCapture(e.pointerId);
    dragStart.current = roomRef.current;
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    const p = svgPoint(svgRef.current, e);
    const o = roomRef.current.objects.find((x) => x.id === d.id);
    if (!o) return;
    if (d.mode === "move") {
      d.moved = true;
      updateObj(d.id, { x: p.x - d.dx, y: p.y - d.dy }, false);
    } else if (d.mode === "rotate") {
      let deg = (Math.atan2(p.y - o.y, p.x - o.x) * 180) / Math.PI + 90;
      const snapTo = Math.round(deg / 15) * 15;
      if (Math.abs(deg - snapTo) < 5) deg = snapTo;
      updateObj(d.id, { r: Math.round(deg) }, false);
    } else {
      const dist = Math.hypot(p.x - o.x, p.y - o.y);
      updateObj(d.id, { s: Math.round(Math.max(0.3, Math.min(3, (d.s0 * dist) / d.d0)) * 100) / 100 }, false);
    }
  };

  const onUp = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    if (!d || !dragStart.current) return;
    const before = dragStart.current;
    dragStart.current = null;
    if (d.mode === "move" && !d.moved) return;
    commit(roomRef.current, before);
  };

  // ---------- Keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || preview) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!selected) return;
      const o = roomRef.current.objects.find((x) => x.id === selected);
      if (!o) return;
      const step = e.shiftKey ? 20 : 5;
      if (e.key === "Delete" || e.key === "Backspace") remove(selected);
      else if (e.key === "Escape") setSelected(null);
      else if (e.key === "ArrowLeft") updateObj(selected, { x: o.x - step });
      else if (e.key === "ArrowRight") updateObj(selected, { x: o.x + step });
      else if (e.key === "ArrowUp") updateObj(selected, { y: o.y - step });
      else if (e.key === "ArrowDown") updateObj(selected, { y: o.y + step });
      else if (e.key === "[") layer(selected, -1);
      else if (e.key === "]") layer(selected, 1);
      else if (e.key.toLowerCase() === "d") duplicate(selected);
      else if (e.key.toLowerCase() === "r") updateObj(selected, { r: o.r + 15 });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------- Dream room ----------
  const runDream = () => {
    const before = dream ?? snap(room);
    const next = generateDreamRoom(room, palette, owned);
    setDream(before);
    commit(next);
    setSelected(null);
    play("sparkle");
  };

  const takePhoto = async () => {
    if (!svgRef.current) return;
    setSelected(null);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const image = await svgToJpeg(svgRef.current);
      await saveScrap({
        id: uuid(), kind: "photo", title: room.name, body: "", emoji: "📸", color: "#FFE3EE", image, room: null,
        date: dateKey(new Date(), tz), createdAt: new Date().toISOString(),
      });
      toast({ text: t("editor.photoSaved"), emoji: "📸", tone: "success" });
      play("chime");
    } catch {
      toast({ text: "common.error", tone: "error" });
    }
  };

  const savePreset = () => {
    const name = presetName.trim() || room.name;
    updatePrefs((p) => ({
      ...p,
      roomPresets: [...p.roomPresets, { id: uuid(), name, room: { name, kind: room.kind, emoji: room.emoji, size: room.size, outdoor: room.outdoor, wall: room.wall, floor: room.floor, objects: room.objects } }],
    }));
    setPresetName("");
    toast({ text: t("rooms.presetSaved"), emoji: "💾", tone: "success" });
  };
  const presets = useWorld((s) => s.prefs.roomPresets);

  const handles = useMemo(() => {
    if (!sel || !selDef || preview) return null;
    const bw = selDef.w * sel.s;
    const bh = selDef.h * sel.s;
    const k = unit; // keep handles ~44px on screen whatever the zoom
    const r = 21 * k;
    const sw = 2.5 * k;
    return (
      <g transform={`translate(${sel.x} ${sel.y}) rotate(${sel.r})`} data-editor-only>
        <rect x={-bw / 2 - 6} y={-bh - 6} width={bw + 12} height={bh + 12} rx={14} fill="none" stroke="var(--c-primary)" strokeWidth={sw} strokeDasharray={`${8 * k} ${6 * k}`} />
        <line x1={0} y1={-bh - 6} x2={0} y2={-bh - 6 - r} stroke="var(--c-primary)" strokeWidth={sw} />
        <g data-handle="rotate" onPointerDown={onHandleDown} style={{ cursor: "grab" }} transform={`translate(0 ${-bh - 6 - r * 1.9})`}>
          <circle r={r} fill="var(--c-surface)" stroke="var(--c-primary)" strokeWidth={sw * 1.4} />
          <path d={`M${-r * 0.4} ${-r * 0.15} a${r * 0.42} ${r * 0.42} 0 1 1 ${r * 0.1} ${r * 0.48}`} fill="none" stroke="var(--c-text)" strokeWidth={sw} strokeLinecap="round" />
        </g>
        <g data-handle="scale" onPointerDown={onHandleDown} style={{ cursor: "nwse-resize" }} transform={`translate(${bw / 2 + 6} 6)`}>
          <circle r={r} fill="var(--c-primary)" stroke="var(--c-surface)" strokeWidth={sw * 1.4} />
          <path d={`M${-r * 0.35} ${-r * 0.35} L${r * 0.35} ${r * 0.35} M${r * 0.35} ${-r * 0.05} V${r * 0.35} H${-r * 0.05}`} stroke="var(--c-on-primary)" strokeWidth={sw} fill="none" strokeLinecap="round" />
        </g>
      </g>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, selDef, preview, unit]);

  const toolbar = sel && selDef && !preview && (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card mt-3 p-3">
      <div className="relative z-[1] flex flex-wrap items-center gap-2">
        <p className="title mr-auto truncate text-sm">{selDef.name[lang]}</p>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateObj(sel.id, { r: sel.r - 15 })} aria-label={`${t("editor.rotate")} -15°`}><RotateCcw size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateObj(sel.id, { r: sel.r + 15 })} aria-label={`${t("editor.rotate")} +15°`}><RotateCw size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateObj(sel.id, { flip: !sel.flip })} aria-label={t("editor.flip")}><FlipHorizontal size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setColorOpen((v) => !v)} aria-label={t("editor.color")} aria-expanded={colorOpen}>
          <span className="h-5 w-5 rounded-full border-2 border-line" style={{ background: sel.c1 ?? selDef.c1 }} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => layer(sel.id, -1)} aria-label={t("editor.backward")}><ArrowDown size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => layer(sel.id, 1)} aria-label={t("editor.forward")}><ArrowUp size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => duplicate(sel.id)} aria-label={t("common.duplicate")}><Copy size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => commit({ ...room, objects: room.objects.map((o) => (o.id === sel.id ? swapObject(o, owned) : o)) })} aria-label={t("editor.swap")}><Shuffle size={18} /></button>
        <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(sel.id)} aria-label={t("common.delete")}><Trash2 size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)} aria-label={t("common.close")}><X size={18} /></button>
      </div>
      <label className="relative z-[1] mt-3 flex items-center gap-3">
        <span className="text-sm font-bold">{t("editor.size")}</span>
        <input type="range" className="range" min={0.3} max={3} step={0.05} value={sel.s} onChange={(e) => updateObj(sel.id, { s: Number(e.target.value) }, false)} onPointerUp={() => commit(roomRef.current)} aria-label={t("editor.size")} />
        <span className="w-12 text-right text-sm font-bold">{Math.round(sel.s * 100)}%</span>
      </label>
      {colorOpen && (
        <div className="relative z-[1] mt-3 grid gap-3 sm:grid-cols-2">
          <ColorField label={t("editor.color1")} value={sel.c1 ?? selDef.c1} onChange={(c) => updateObj(sel.id, { c1: c })} swatches={palette} />
          <ColorField label={t("editor.color2")} value={sel.c2 ?? selDef.c2} onChange={(c) => updateObj(sel.id, { c2: c })} swatches={palette} />
        </div>
      )}
    </motion.div>
  );

  const actions = (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <button className="btn btn-primary btn-sm shrink-0" onClick={() => setPanel("catalog")}><Sofa size={18} /> {t("editor.catalog")}</button>
      <button className="btn btn-soft btn-sm shrink-0" onClick={() => setPanel("room")}><Paintbrush size={18} /> {t("editor.room")}</button>
      <button className="btn btn-soft btn-sm shrink-0" onClick={runDream}><Wand2 size={18} /> {t("editor.dream")}</button>
      <button className="btn btn-ghost btn-icon btn-sm shrink-0" onClick={undo} disabled={!past.length} aria-label={t("common.undo")}><Undo2 size={18} /></button>
      <button className="btn btn-ghost btn-icon btn-sm shrink-0" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={18} /></button>
      <button className="btn btn-ghost btn-sm shrink-0" onClick={() => { setSelected(null); setPreview(true); }}><Eye size={18} /> {t("editor.preview")}</button>
      <button className="btn btn-ghost btn-sm shrink-0" onClick={takePhoto}><Camera size={18} /> {t("editor.photo")}</button>
      <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setPanel("presets")}><Save size={18} /> {t("rooms.presets")}</button>
    </div>
  );

  return (
    <div className={isWide && !preview ? "grid grid-cols-[1fr_340px] gap-5" : ""}>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Link href="/rooms" className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.back")}><ChevronLeft size={20} /></Link>
          <h1 className="logo-type min-w-0 flex-1 truncate text-2xl">{room.emoji} {room.name}</h1>
          {preview ? (
            <button className="btn btn-primary btn-sm" onClick={() => setPreview(false)}><Pencil size={16} /> {t("rooms.edit")}</button>
          ) : (
            <span className="hidden text-xs font-bold text-muted sm:block">✓ {t("editor.autosaved")}</span>
          )}
        </div>

        <div className="card relative overflow-hidden p-1.5">
          <div className="relative z-[1]">
            <RoomCanvas
              ref={svgRef}
              room={room}
              selectedId={selected}
              interactive={!preview}
              onObjectPointerDown={preview ? undefined : onObjectDown}
              onBackgroundPointerDown={() => {
                if (!drag.current) setSelected(null);
              }}
              overlay={handles}
              title={room.name}
            />
            {preview && <WalkingCompanion width={w} />}
          </div>
        </div>

        {!preview && (
          <>
            {toolbar}
            {!sel && <p className="mt-3 text-center text-sm text-muted">{t("editor.selectHint")}</p>}
            <AnimatePresence>
              {dream && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card mt-3 flex flex-wrap items-center gap-2 p-3">
                  <p className="title relative z-[1] mr-auto">✨ {t("editor.dreamDone")}</p>
                  <button className="btn btn-ghost btn-sm relative z-[1]" onClick={() => { commit({ ...room, ...dream }); setDream(null); }}>{t("common.cancel")}</button>
                  <button className="btn btn-soft btn-sm relative z-[1]" onClick={runDream}>🎲 {t("editor.dreamAgain")}</button>
                  <button className="btn btn-primary btn-sm relative z-[1]" onClick={() => setDream(null)}>💗 {t("editor.dreamKeep")}</button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-3">{actions}</div>
          </>
        )}
        {preview && (
          <p className="mt-3 text-center text-sm text-muted">
            <button className="btn btn-ghost btn-sm" onClick={takePhoto}><Camera size={16} /> {t("editor.photo")}</button>
          </p>
        )}
      </div>

      {isWide && !preview && (
        <aside className="card sticky top-24 h-[calc(100dvh-8rem)] overflow-hidden p-4">
          <div className="relative z-[1] flex h-full flex-col">
            <div className="seg mb-3 self-start">
              <button aria-pressed={panel !== "room"} onClick={() => setPanel("catalog")}>{t("editor.catalog")}</button>
              <button aria-pressed={panel === "room"} onClick={() => setPanel("room")}>{t("editor.room")}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {panel === "room" ? <RoomPanel room={room} onChange={(r) => commit(r)} /> : <CatalogPanel onPick={addItem} />}
            </div>
          </div>
        </aside>
      )}

      {!isWide && (
        <>
          <Sheet open={panel === "catalog"} onClose={() => setPanel(null)} title={t("editor.catalog")}>
            <CatalogPanel onPick={addItem} />
          </Sheet>
          <Sheet open={panel === "room"} onClose={() => setPanel(null)} title={t("editor.room")}>
            <RoomPanel room={room} onChange={(r) => commit(r)} />
          </Sheet>
        </>
      )}
      <Sheet open={panel === "presets"} onClose={() => setPanel(null)} title={t("rooms.presets")}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className="field" placeholder={t("editor.comboName")} value={presetName} onChange={(e) => setPresetName(e.target.value)} maxLength={40} />
            <button className="btn btn-primary shrink-0" onClick={savePreset}>{t("common.save")}</button>
          </div>
          {presets.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <ul className="space-y-2">
              {presets.map((p) => (
                <li key={p.id} className="card-flat flex items-center gap-2 p-2">
                  <span className="min-w-0 flex-1 truncate font-bold">{p.room.emoji} {p.name}</span>
                  <button className="btn btn-soft btn-sm" onClick={() => { commit({ ...room, wall: p.room.wall, floor: p.room.floor, size: p.room.size, objects: p.room.objects.map((o) => ({ ...o, id: newId() })) }); setPanel(null); }}>
                    {t("rooms.applyPreset")}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.delete")} onClick={() => updatePrefs((pr) => ({ ...pr, roomPresets: pr.roomPresets.filter((x) => x.id !== p.id) }))}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(t("editor.clearConfirm"))) { commit({ ...room, objects: [] }); setPanel(null); } }}>
            <Trash2 size={16} /> {t("editor.clearRoom")}
          </button>
        </div>
      </Sheet>
      {/* Pointer move/up handling lives on the svg through these listeners */}
      <PointerBridge svgRef={svgRef} onMove={onMove} onUp={onUp} />
    </div>
  );
}

/** Attaches move/up listeners to the canvas element (keeps RoomCanvas presentational). */
function PointerBridge({ svgRef, onMove, onUp }: { svgRef: React.RefObject<SVGSVGElement | null>; onMove: (e: RPointerEvent<SVGSVGElement>) => void; onUp: (e: RPointerEvent<SVGSVGElement>) => void }) {
  const mv = useRef(onMove);
  const up = useRef(onUp);
  useLayoutEffect(() => {
    mv.current = onMove;
    up.current = onUp;
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const m = (e: PointerEvent) => mv.current(e as unknown as RPointerEvent<SVGSVGElement>);
    const u = (e: PointerEvent) => up.current(e as unknown as RPointerEvent<SVGSVGElement>);
    el.addEventListener("pointermove", m);
    el.addEventListener("pointerup", u);
    el.addEventListener("pointercancel", u);
    return () => {
      el.removeEventListener("pointermove", m);
      el.removeEventListener("pointerup", u);
      el.removeEventListener("pointercancel", u);
    };
  }, [svgRef]);
  return null;
}
