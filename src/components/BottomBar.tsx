"use client";

import React from "react";
import { PALETTES } from "../constants/palettes";

interface BottomBarProps {
  paletteIdx: number;
  textColor: string;
  bgColor: string;
  gardenersCount: number;
  onPaletteSelect: (idx: number) => void;
  onSavePNG: () => void;
  onSaveSVG: () => void;
}

export function BottomBar({
  paletteIdx,
  textColor,
  bgColor,
  gardenersCount,
  onPaletteSelect,
  onSavePNG,
  onSaveSVG,
}: BottomBarProps) {
  return (
    <div
      data-tg="bar"
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        bottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 12,
        letterSpacing: "0.04em",
        color: textColor,
        opacity: 0.6,
        pointerEvents: "auto",
        zIndex: 5,
      }}
    >
      <div data-tg="hints" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <span data-tg="fine">type to grow</span>
        <span data-tg="coarse">tap to type</span>
        <span>space cuts</span>
        <span data-tg="fine">backspace withers</span>
        <span data-tg="coarse">⌫ withers</span>
        <span data-tg="fine">enter clears</span>
        <span data-tg="coarse">return clears</span>
        <span data-tg="count">
          {gardenersCount > 1 ? `${gardenersCount} gardeners here` : ""}
        </span>
      </div>

      <div data-tg="ctrls" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          data-tg="pal"
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            padding: "4px 6px",
            border: "1px solid #3A3A3A",
            borderRadius: 999,
            background: bgColor,
          }}
        >
          {PALETTES.map((p, idx) => {
            const isSelected = paletteIdx === idx;
            return (
              <button
                key={p.name}
                data-tg="sw"
                onClick={e => {
                  e.stopPropagation();
                  onPaletteSelect(idx);
                }}
                aria-label={p.name}
                title={p.name}
                style={{
                  width: 22,
                  height: 22,
                  padding: 0,
                  borderRadius: 999,
                  cursor: "pointer",
                  background: p.bg,
                  border: `1.5px solid ${isSelected ? textColor : p.bg === bgColor ? "#3A3A3A" : "transparent"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${isSelected ? 1.1 : 1})`,
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.15)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = `scale(${isSelected ? 1.1 : 1})`;
                }}
              >
                <span
                  data-tg="dot"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: p.flower,
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          data-tg="btn"
          onClick={onSavePNG}
          style={{
            background: "transparent",
            border: "1px solid #3A3A3A",
            color: "#BDBDBD",
            font: "inherit",
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#FFFFFF";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#3A3A3A";
            e.currentTarget.style.color = "#BDBDBD";
          }}
        >
          PNG
        </button>
        <button
          data-tg="btn"
          onClick={onSaveSVG}
          style={{
            background: "transparent",
            border: "1px solid #3A3A3A",
            color: "#BDBDBD",
            font: "inherit",
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#FFFFFF";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#3A3A3A";
            e.currentTarget.style.color = "#BDBDBD";
          }}
        >
          SVG
        </button>
      </div>
    </div>
  );
}
