export type FlowerType =
  | "rose"
  | "sakura"
  | "daisy"
  | "tulip"
  | "sunflower"
  | "lotus"
  | "poppy"
  | "wildflower";

export interface FlowerOption {
  id: FlowerType;
  label: string;
  icon: string;
  desc: string;
}

export const FLOWER_OPTIONS: FlowerOption[] = [
  { id: "rose", label: "Rose", icon: "🌹", desc: "Layered spiral velvet bloom" },
  { id: "sakura", label: "Sakura", icon: "🌸", desc: "Delicate 5-petal cherry blossom" },
  { id: "daisy", label: "Daisy", icon: "🌼", desc: "Radiant ray petals with sun disc" },
  { id: "tulip", label: "Tulip", icon: "🌷", desc: "Sculpted chalice cup & slender bud" },
  { id: "sunflower", label: "Sunflower", icon: "🌻", desc: "Luminous double ray with seed core" },
  { id: "lotus", label: "Lotus", icon: "🪷", desc: "Tiered pointed sacred petals" },
  { id: "poppy", label: "Poppy", icon: "🌺", desc: "Papery ruffled petals & seed crown" },
  { id: "wildflower", label: "Mixed", icon: "💐", desc: "Every word blooms a different flower" },
];

export const PRESET_DEFAULT_FLOWERS: Record<string, FlowerType> = {
  breathe: "rose",
  grow: "sakura",
  typed: "tulip",
  wind: "daisy",
  reach: "sunflower",
  scatter: "poppy",
  visit: "lotus",
};

export const CONCRETE_FLOWERS: FlowerType[] = [
  "rose",
  "sakura",
  "daisy",
  "tulip",
  "sunflower",
  "lotus",
  "poppy",
];

export function resolveFlowerType(flower: FlowerType | undefined, seed: number): FlowerType {
  if (!flower || flower === "wildflower") {
    const idx = Math.abs(seed) % CONCRETE_FLOWERS.length;
    return CONCRETE_FLOWERS[idx];
  }
  return flower;
}
