"use client";

import { forwardRef, memo, useId, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type { Room, RoomObject } from "@/lib/types";
import { ITEM_MAP, artProps } from "@/lib/catalog/furniture";
import { surfaceDef } from "@/lib/catalog/surfaces";
import { dims, sortedObjects } from "@/lib/rooms/layout";
import { darken, mix } from "@/lib/theme/color";

export const ObjectArt = memo(function ObjectArt({ o }: { o: RoomObject }) {
  const def = ITEM_MAP[o.item];
  if (!def) return null;
  const p = artProps(o.c1 ?? def.c1, o.c2 ?? def.c2);
  const sx = o.flip ? -o.s : o.s;
  return (
    <g transform={`translate(${o.x} ${o.y}) rotate(${o.r}) scale(${sx} ${o.s}) translate(${-def.w / 2} ${-def.h})`}>{def.art(p)}</g>
  );
});

interface Props {
  room: Room;
  selectedId?: string | null;
  onObjectPointerDown?: (e: RPointerEvent<SVGGElement>, o: RoomObject) => void;
  onBackgroundPointerDown?: (e: RPointerEvent<SVGSVGElement>) => void;
  className?: string;
  overlay?: ReactNode;
  title?: string;
  interactive?: boolean;
}

/** The whole room is one SVG: wall + floor patterns, furniture, and an optional overlay (handles, companion…). */
export const RoomCanvas = forwardRef<SVGSVGElement, Props>(function RoomCanvas(
  { room, selectedId, onObjectPointerDown, onBackgroundPointerDown, className = "", overlay, title, interactive },
  ref,
) {
  const uid = useId().replace(/:/g, "");
  const { w, h, wallH } = dims(room);
  const wallId = `wall-${uid}`;
  const floorId = `floor-${uid}`;
  const shade = mix(room.floor.c1, "#5A2149", 0.25);
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${h}`}
      className={`block h-auto w-full select-none ${className}`}
      role="img"
      aria-label={title ?? room.name}
      onPointerDown={onBackgroundPointerDown}
      style={{ touchAction: interactive ? "none" : "auto" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {surfaceDef(wallId, room.wall.pattern, room.wall.c1, room.wall.c2, wallH)}
        {surfaceDef(floorId, room.floor.pattern, room.floor.c1, room.floor.c2)}
        <linearGradient id={`fshade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade} stopOpacity={0.28} />
          <stop offset="0.25" stopColor={shade} stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`light-${uid}`} cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.25} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      {room.outdoor ? (
        <>
          <rect width={w} height={h} fill={`url(#${wallId})`} />
          <path d={`M0 ${wallH + 10} Q ${w * 0.25} ${wallH - 40} ${w * 0.5} ${wallH} T ${w} ${wallH - 10} L ${w} ${h} L 0 ${h} Z`} fill={darken(room.floor.c1, 0.08)} />
          <path d={`M0 ${wallH + 40} Q ${w * 0.3} ${wallH} ${w * 0.6} ${wallH + 30} T ${w} ${wallH + 20} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${floorId})`} />
        </>
      ) : (
        <>
          <rect width={w} height={wallH} fill={`url(#${wallId})`} />
          <rect width={w} height={wallH} fill={`url(#light-${uid})`} />
          <rect y={wallH} width={w} height={h - wallH} fill={`url(#${floorId})`} />
          <rect y={wallH} width={w} height={h - wallH} fill={`url(#fshade-${uid})`} />
          <rect y={wallH - 14} width={w} height={16} fill={mix(room.wall.c1, "#FFFFFF", 0.5)} stroke={mix(room.wall.c1, "#5A2149", 0.25)} strokeWidth={2} />
        </>
      )}
      {sortedObjects(room.objects).map((o) => (
        <g
          key={o.id}
          data-object-id={o.id}
          onPointerDown={onObjectPointerDown ? (e) => onObjectPointerDown(e, o) : undefined}
          style={{ cursor: onObjectPointerDown ? "grab" : undefined }}
          opacity={selectedId && selectedId !== o.id ? 0.94 : 1}
        >
          <ObjectArt o={o} />
        </g>
      ))}
      {overlay}
    </svg>
  );
});

export function RoomThumb({ room, className = "" }: { room: Room; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[calc(var(--r)*0.7)] border-2 border-line bg-surface2 ${className}`}>
      <RoomCanvas room={room} />
    </div>
  );
}
