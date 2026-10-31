// Companion skin registry.
//
// The default skin is an ORIGINAL character drawn in code (components/companion/Companion.tsx).
// Official Hello Kitty / Sanrio artwork must only be added with a proper license. When you have one,
// put the files in /public/licensed/<skin-id>/ (one image per pose) and register the skin here.
// The app will then render <img> sprites for that skin instead of the original SVG.

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
  { id: "original-kitten", label: "Original kitten", kind: "svg-original" },
  // Example (disabled until a license is obtained):
  // { id: "licensed-kitty", label: "Licensed", kind: "licensed-sprites",
  //   sprites: { idle: "/licensed/kitty/idle.png", wave: "/licensed/kitty/wave.png" },
  //   licenseNote: "Licensed from … on …" },
];

export const ACTIVE_SKIN = SKINS[0];
