import { FlowerType } from "./flowers";

export interface MotionPreset {
  id: string;
  label: string;
  sub?: string;
  T: number;
  flower: FlowerType;
}

export const PRESETS: MotionPreset[] = [
  { id: "breathe", label: "Inhale", sub: "Slow sway · Rose 🌹", T: 3000, flower: "rose" },
  { id: "grow", label: "Grow", sub: "Bloom & wither · Sakura 🌸", T: 6000, flower: "sakura" },
  { id: "typed", label: "Reveal", sub: "Type & repeat · Tulip 🌷", T: 5000, flower: "tulip" },
  { id: "wind", label: "Drift", sub: "Wind breeze · Daisy 🌼", T: 4000, flower: "daisy" },
  { id: "reach", label: "Ascend", sub: "Stems seek light · Sunflower 🌻", T: 6000, flower: "sunflower" },
  { id: "scatter", label: "Disperse", sub: "Spiraling fade · Poppy 🌺", T: 6000, flower: "poppy" },
  { id: "visit", label: "Flutter", sub: "Butterfly perch · Lotus 🪷", T: 7000, flower: "lotus" },
];

export function getPreset(id: string): MotionPreset {
  return PRESETS.find(p => p.id === id) || PRESETS[0];
}
