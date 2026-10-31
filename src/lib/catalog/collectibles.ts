export type CollectibleSet = "sweets" | "flowers" | "sea" | "sky" | "magic" | "golden";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface CollectibleDef {
  id: string;
  set: CollectibleSet;
  emoji: string;
  rarity: Rarity;
  name: { fr: string; en: string };
}

export const COLLECTIBLES: CollectibleDef[] = [
  { id: "macaron", set: "sweets", emoji: "🧁", rarity: "common", name: { fr: "Macaron rose", en: "Pink macaron" } },
  { id: "croissant", set: "sweets", emoji: "🥐", rarity: "common", name: { fr: "Croissant doré", en: "Golden croissant" } },
  { id: "strawberry", set: "sweets", emoji: "🍓", rarity: "common", name: { fr: "Fraise des bois", en: "Wild strawberry" } },
  { id: "eclair", set: "sweets", emoji: "🍫", rarity: "rare", name: { fr: "Éclair au chocolat", en: "Chocolate éclair" } },
  { id: "icecream", set: "sweets", emoji: "🍦", rarity: "rare", name: { fr: "Glace vanille-fraise", en: "Strawberry swirl" } },
  { id: "candy", set: "sweets", emoji: "🍬", rarity: "common", name: { fr: "Bonbon nuage", en: "Cloud candy" } },
  { id: "rose", set: "flowers", emoji: "🌹", rarity: "common", name: { fr: "Rose tendre", en: "Tender rose" } },
  { id: "tulip", set: "flowers", emoji: "🌷", rarity: "common", name: { fr: "Tulipe", en: "Tulip" } },
  { id: "sakura", set: "flowers", emoji: "🌸", rarity: "rare", name: { fr: "Fleur de cerisier", en: "Cherry blossom" } },
  { id: "sunflower", set: "flowers", emoji: "🌻", rarity: "common", name: { fr: "Tournesol", en: "Sunflower" } },
  { id: "lavender", set: "flowers", emoji: "💐", rarity: "rare", name: { fr: "Bouquet de lavande", en: "Lavender bouquet" } },
  { id: "clover", set: "flowers", emoji: "🍀", rarity: "epic", name: { fr: "Trèfle à quatre feuilles", en: "Four-leaf clover" } },
  { id: "shell", set: "sea", emoji: "🐚", rarity: "common", name: { fr: "Coquillage", en: "Seashell" } },
  { id: "pearl", set: "sea", emoji: "🫧", rarity: "rare", name: { fr: "Perle bulle", en: "Bubble pearl" } },
  { id: "starfish", set: "sea", emoji: "⭐", rarity: "common", name: { fr: "Étoile de mer", en: "Starfish" } },
  { id: "fish", set: "sea", emoji: "🐠", rarity: "rare", name: { fr: "Poisson arc-en-ciel", en: "Rainbow fish" } },
  { id: "dolphin", set: "sea", emoji: "🐬", rarity: "epic", name: { fr: "Petit dauphin", en: "Little dolphin" } },
  { id: "moon", set: "sky", emoji: "🌙", rarity: "common", name: { fr: "Croissant de lune", en: "Crescent moon" } },
  { id: "shooting_star", set: "sky", emoji: "🌠", rarity: "rare", name: { fr: "Étoile filante", en: "Shooting star" } },
  { id: "cloud", set: "sky", emoji: "☁️", rarity: "common", name: { fr: "Nuage tout doux", en: "Soft cloud" } },
  { id: "rainbow", set: "sky", emoji: "🌈", rarity: "epic", name: { fr: "Arc-en-ciel", en: "Rainbow" } },
  { id: "comet", set: "sky", emoji: "☄️", rarity: "epic", name: { fr: "Comète", en: "Comet" } },
  { id: "crystal", set: "magic", emoji: "🔮", rarity: "rare", name: { fr: "Cristal magique", en: "Magic crystal" } },
  { id: "wand", set: "magic", emoji: "🪄", rarity: "rare", name: { fr: "Baguette scintillante", en: "Sparkly wand" } },
  { id: "potion", set: "magic", emoji: "🧪", rarity: "common", name: { fr: "Potion rose", en: "Pink potion" } },
  { id: "unicorn", set: "magic", emoji: "🦄", rarity: "epic", name: { fr: "Licorne", en: "Unicorn" } },
  { id: "butterfly", set: "magic", emoji: "🦋", rarity: "common", name: { fr: "Papillon", en: "Butterfly" } },
  { id: "golden_heart", set: "golden", emoji: "💛", rarity: "legendary", name: { fr: "Cœur d’or", en: "Golden heart" } },
  { id: "golden_crown", set: "golden", emoji: "👑", rarity: "legendary", name: { fr: "Couronne d’or", en: "Golden crown" } },
];

export const COLLECTIBLE_MAP: Record<string, CollectibleDef> = Object.fromEntries(COLLECTIBLES.map((c) => [c.id, c]));

export const SET_ORDER: CollectibleSet[] = ["sweets", "flowers", "sea", "sky", "magic", "golden"];

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 0 };
