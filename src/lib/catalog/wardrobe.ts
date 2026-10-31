import type { SeasonId } from "../seasons";

export interface WearableDef {
  id: string;
  kind: "outfit" | "accessory";
  name: { fr: string; en: string };
  price: number;
  color: string; // default color
  colorable: boolean;
  season?: SeasonId;
  group?: "pajamas" | "seasonal" | "everyday" | "party";
}

export const WEARABLES: WearableDef[] = [
  // Outfits
  { id: "dress", kind: "outfit", name: { fr: "Robe à volants", en: "Ruffle dress" }, price: 0, color: "#FF8DC0", colorable: true, group: "everyday" },
  { id: "mariniere", kind: "outfit", name: { fr: "Marinière parisienne", en: "Breton stripes" }, price: 0, color: "#7FA8FF", colorable: true, group: "everyday" },
  { id: "overalls", kind: "outfit", name: { fr: "Salopette", en: "Overalls" }, price: 0, color: "#A8DAFF", colorable: true, group: "everyday" },
  { id: "sweater", kind: "outfit", name: { fr: "Pull cœur", en: "Heart sweater" }, price: 0, color: "#C9B6FF", colorable: true, group: "everyday" },
  { id: "pajamas_stars", kind: "outfit", name: { fr: "Pyjama étoilé", en: "Starry pajamas" }, price: 0, color: "#B9C8FF", colorable: true, group: "pajamas" },
  { id: "pajamas_clouds", kind: "outfit", name: { fr: "Pyjama nuage", en: "Cloud pajamas" }, price: 40, color: "#FFD1E2", colorable: true, group: "pajamas" },
  { id: "apron", kind: "outfit", name: { fr: "Tablier pâtissière", en: "Baker apron" }, price: 30, color: "#FFFFFF", colorable: true, group: "everyday" },
  { id: "raincoat", kind: "outfit", name: { fr: "Ciré de pluie", en: "Raincoat" }, price: 40, color: "#FFE08A", colorable: true, group: "everyday" },
  { id: "tutu", kind: "outfit", name: { fr: "Tutu de danse", en: "Ballet tutu" }, price: 60, color: "#FFC2D9", colorable: true, group: "party" },
  { id: "princess", kind: "outfit", name: { fr: "Robe de princesse", en: "Princess gown" }, price: 120, color: "#E8B4FF", colorable: true, group: "party" },
  { id: "witch", kind: "outfit", name: { fr: "Cape de petite sorcière", en: "Little witch cape" }, price: 0, color: "#9F8CFF", colorable: true, season: "halloween", group: "seasonal" },
  { id: "santa", kind: "outfit", name: { fr: "Tenue de lutin", en: "Elf outfit" }, price: 0, color: "#FF6F8E", colorable: false, season: "christmas", group: "seasonal" },
  { id: "swimsuit", kind: "outfit", name: { fr: "Maillot à pois", en: "Polka swimsuit" }, price: 0, color: "#FF8DC0", colorable: true, season: "summer", group: "seasonal" },
  { id: "coat", kind: "outfit", name: { fr: "Manteau douillet", en: "Snug coat" }, price: 0, color: "#FFB38A", colorable: true, season: "winter", group: "seasonal" },
  // Accessories
  { id: "beret", kind: "accessory", name: { fr: "Béret", en: "Beret" }, price: 0, color: "#FF6F8E", colorable: true },
  { id: "glasses_heart", kind: "accessory", name: { fr: "Lunettes cœur", en: "Heart glasses" }, price: 0, color: "#FF5C8A", colorable: true },
  { id: "flower_crown", kind: "accessory", name: { fr: "Couronne de fleurs", en: "Flower crown" }, price: 0, color: "#FFC2D9", colorable: false },
  { id: "headphones", kind: "accessory", name: { fr: "Casque audio", en: "Headphones" }, price: 40, color: "#C9B6FF", colorable: true },
  { id: "scarf", kind: "accessory", name: { fr: "Écharpe", en: "Scarf" }, price: 20, color: "#A8DAFF", colorable: true },
  { id: "sunglasses", kind: "accessory", name: { fr: "Lunettes de soleil", en: "Sunglasses" }, price: 30, color: "#2D2547", colorable: false },
  { id: "wand", kind: "accessory", name: { fr: "Baguette magique", en: "Magic wand" }, price: 50, color: "#FFE08A", colorable: false },
  { id: "nightcap", kind: "accessory", name: { fr: "Bonnet de nuit", en: "Nightcap" }, price: 0, color: "#B9C8FF", colorable: true, group: "pajamas" },
  { id: "witch_hat", kind: "accessory", name: { fr: "Chapeau de sorcière", en: "Witch hat" }, price: 0, color: "#9F8CFF", colorable: true, season: "halloween", group: "seasonal" },
  { id: "santa_hat", kind: "accessory", name: { fr: "Bonnet de Noël", en: "Santa hat" }, price: 0, color: "#FF6F8E", colorable: false, season: "christmas", group: "seasonal" },
  { id: "earmuffs", kind: "accessory", name: { fr: "Cache-oreilles", en: "Earmuffs" }, price: 0, color: "#FFFFFF", colorable: true, season: "winter", group: "seasonal" },
  { id: "bunny_ears", kind: "accessory", name: { fr: "Oreilles de lapin", en: "Bunny ears" }, price: 0, color: "#FFFFFF", colorable: true, season: "spring", group: "seasonal" },
];

export const WEARABLE_MAP: Record<string, WearableDef> = Object.fromEntries(WEARABLES.map((w) => [w.id, w]));

export const FUR_COLORS = ["#FFFFFF", "#FFF4E6", "#FFE3EE", "#EDE4FF", "#E3F1FF", "#F2E2D2", "#E8E8EE", "#FFE9B8"];
export const BOW_COLORS = ["#FF5C8A", "#FF8DC0", "#C9B6FF", "#8CCBFF", "#FFD45E", "#8FE0BC", "#FF6F61", "#B48CFF"];
