// Companion skin registry.
//
// Mimi is an ORIGINAL character drawn in code (components/companion/Companion.tsx).
// Only original artwork, or artwork whose license is on record, may ever be added here: put the files in
// /public/licensed/<skin-id>/ (one image per pose), register the skin below with its licenseNote, and the
// app renders <img> sprites for that skin instead of the original SVG. Never add third-party characters.

export type Pose = "idle" | "wave" | "hug" | "sleep" | "celebrate" | "present";

export interface SkinDef {
  id: string;
  label: string;
  kind: "svg-original" | "licensed-sprites";
  /** For licensed sprites: map each pose to a file under /public/licensed */
  sprites?: Partial<Record<Pose, string>>;
  licenseNote?: string;
}

export const SKINS: SkinDef[] = [
  { id: "original-mimi", label: "Mimi (original)", kind: "svg-original" },
];

export const ACTIVE_SKIN = SKINS[0];
