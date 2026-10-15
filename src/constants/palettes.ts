export interface PaletteItem {
  name: string;
  bg: string;
  flower: string;
  stem: string;
  line: string;
  text: string;
  colors: {
    red: string;
    blue: string;
    line: string;
    text: string;
    vein: string;
  };
}

export const RAW_PALETTES: [string, string, string, string, string, string][] = [
  ["Rose noir", "#000000", "#FF1400", "#3257FF", "#FFB4A8", "#FFFFFF"],
  ["Paper", "#F3EEE4", "#FF3B1F", "#1C2B8F", "#FFD2C4", "#111111"],
  ["Midnight", "#0D1B4C", "#FF5A4E", "#9FB4FF", "#FFD6CF", "#FFFFFF"],
  ["Citrus", "#0E1A12", "#FF8A00", "#1FA463", "#FFE2B8", "#FFF6E8"],
  ["Orchid", "#140A1F", "#E63CFF", "#2FB8A6", "#F9D1FF", "#FFFFFF"],
  ["Moss", "#133A2A", "#FFB7C5", "#7FD18B", "#FFFFFF", "#F6F1E7"],
  ["Tomato", "#FF1400", "#FFF1E0", "#0B0B0B", "#FF1400", "#000000"],
  ["Butter", "#FFE9A8", "#E4002B", "#0F5132", "#FFC2C2", "#1A1A1A"],
  ["Blush", "#FAD4D8", "#C8102E", "#274690", "#FFE3E6", "#1A1A1A"],
  ["Mono", "#000000", "#F2F2F2", "#6E6E6E", "#000000", "#FFFFFF"],
];

export const PALETTES: PaletteItem[] = RAW_PALETTES.map(([name, bg, flower, stem, line, text]) => ({
  name,
  bg,
  flower,
  stem,
  line,
  text,
  colors: {
    red: flower,
    blue: stem,
    line,
    text,
    vein: bg,
  },
}));

export function getPalette(idx: number): PaletteItem {
  return PALETTES[idx] || PALETTES[0];
}
