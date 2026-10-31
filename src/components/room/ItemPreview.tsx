"use client";

import { memo } from "react";
import { ITEM_MAP, artProps } from "@/lib/catalog/furniture";
import { surfaceDef } from "@/lib/catalog/surfaces";

export const ItemPreview = memo(function ItemPreview({ id, c1, c2, size = 64 }: { id: string; c1?: string; c2?: string; size?: number }) {
  const def = ITEM_MAP[id];
  if (!def) return null;
  const pad = 8;
  return (
    <svg viewBox={`${-pad} ${-pad} ${def.w + pad * 2} ${def.h + pad * 2}`} width={size} height={size} aria-hidden className="overflow-visible">
      {def.art(artProps(c1 ?? def.c1, c2 ?? def.c2))}
    </svg>
  );
});

export const SurfacePreview = memo(function SurfacePreview({ pattern, c1, c2, id }: { pattern: string; c1: string; c2: string; id: string }) {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
      <defs>{surfaceDef(`sp-${id}`, pattern, c1, c2, 80)}</defs>
      <rect width="120" height="80" fill={`url(#sp-${id})`} />
    </svg>
  );
});
