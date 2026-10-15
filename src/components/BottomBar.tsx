"use client";

import React, { useState, useRef, useEffect } from "react";
import { PALETTES } from "../constants/palettes";
import { FLOWER_OPTIONS, FlowerType } from "../constants/flowers";

interface BottomBarProps {
  paletteIdx: number;
  textColor: string;
  bgColor: string;
  gardenersCount: number;
  flowerType: FlowerType;
  onPaletteSelect: (idx: number) => void;
  onFlowerSelect: (flower: FlowerType) => void;
  onRegrow: () => void;
  onSavePNG: () => void;
  onSaveSVG: () => void;
}

export function BottomBar({
  paletteIdx,
  textColor,
  bgColor,
  gardenersCount,
  flowerType,
  onPaletteSelect,
  onFlowerSelect,
  onRegrow,
  onSavePNG,
  onSaveSVG,
}: BottomBarProps) {
  const [flowerMenuOpen, setFlowerMenuOpen] = useState(false);
  const flowerMenuRef = useRef<HTMLDivElement | null>(null);

  const activeFlower = FLOWER_OPTIONS.find(f => f.id === flowerType) || FLOWER_OPTIONS[0];

  useEffect(() => {
    if (!flowerMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (flowerMenuRef.current && !flowerMenuRef.current.contains(e.target as Node)) {
        setFlowerMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlowerMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [flowerMenuOpen]);

  const actionBtnStyle: React.CSSProperties = {
    background: "#000000",
    border: "1px solid #3A3A3A",
    color: "#FFFFFF",
    font: "inherit",
    lineHeight: "inherit",
  };
  const actionBtnClass =
    "px-3.5 py-1.5 md:py-2 text-[11px] md:text-[12px] inline-flex items-center justify-center cursor-pointer rounded-full";

  return (
    <div
      data-tg="bar"
      className="left-2 right-2 sm:left-4 sm:right-4 md:left-6 md:right-6 bottom-3 md:bottom-5 justify-center md:justify-end"
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 12,
        letterSpacing: "0.04em",
        color: textColor,
        opacity: 0.85,
        pointerEvents: "auto",
        zIndex: 5,
      }}
    >
      <div
        data-tg="ctrls"
        className="w-full md:w-auto flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-3"
      >
        {/* Actions Row: Refresh, PNG, SVG */}
        <div data-tg="actions" className="order-1 md:order-2 flex flex-row items-center justify-center gap-2 w-full md:w-auto">
          <button
            type="button"
            data-tg="btn"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onRegrow();
            }}
            title="Refresh"
            aria-label="Refresh garden"
            className={actionBtnClass}
            style={actionBtnStyle}
          >
            Refresh
          </button>
          <button type="button" data-tg="btn" onClick={onSavePNG} className={actionBtnClass} style={actionBtnStyle}>
            PNG
          </button>
          <button type="button" data-tg="btn" onClick={onSaveSVG} className={actionBtnClass} style={actionBtnStyle}>
            SVG
          </button>
        </div>

        {/* Single combined pill: [ theme swatches | flower dropdown ] */}
        <div
          data-tg="pickers"
          className="order-2 md:order-1 flex flex-row flex-nowrap items-center justify-between md:justify-start w-full md:w-auto shrink-0"
          style={{

            borderRadius: 999,
            background: bgColor,
            padding: "2px 6px 2px 8px",
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {/* Theme swatches */}
          <div
            data-tg="pal"
            className="flex flex-row flex-nowrap items-center justify-between md:justify-start flex-1 min-w-0 md:flex-initial gap-[1.5px] sm:gap-[3px] md:gap-[5px] px-[2px] md:px-[4px]"
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
                  className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] md:w-[22px] md:h-[22px] flex items-center justify-center rounded-full shrink-0 cursor-pointer p-0"
                  style={{
                    background: p.bg,
                    border: `1.5px solid ${isSelected ? textColor : p.bg === bgColor ? "#3A3A3A" : "transparent"}`,
                    transform: `scale(${isSelected ? 1.15 : 1})`,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.25)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = `scale(${isSelected ? 1.15 : 1})`;
                  }}
                >
                  <span
                    data-tg="dot"
                    className="w-[7px] h-[7px] sm:w-[8px] sm:h-[8px] md:w-[9px] md:h-[9px] rounded-full shrink-0"
                    style={{ background: p.flower }}
                  />
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <span
            aria-hidden
            className="shrink-0"
            style={{
              margin: "0 6px",
              color: textColor,
              opacity: 0.4,
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            |
          </span>

          {/* Flower dropdown (icon only) */}
          <div ref={flowerMenuRef} className="shrink-0" style={{ position: "relative" }}>
            <button
              type="button"
              data-tg="flw-dd"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setFlowerMenuOpen(v => !v);
              }}
              aria-label={`Selected flower: ${activeFlower.label}`}
              aria-haspopup="listbox"
              aria-expanded={flowerMenuOpen}
              title={activeFlower.label}
              className="inline-flex items-center justify-center cursor-pointer rounded-full h-[22px] md:h-[26px] shrink-0"
              style={{
                background: flowerMenuOpen ? "rgba(255,255,255,0.12)" : "transparent",
                border: 0,
                padding: "0 6px 0 5px",
                gap: 4,
                fontSize: 15,
                lineHeight: 1,
                color: textColor,
                transition: "background 0.15s ease",
              }}
            >
              <span style={{ lineHeight: 1 }}>{activeFlower.icon}</span>
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{
                  opacity: 0.65,
                  flexShrink: 0,
                  transform: flowerMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {flowerMenuOpen && (
              <div
                role="listbox"
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 12px)",
                  right: 0,
                  background: "rgba(12, 12, 12, 0.96)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid #333333",
                  borderRadius: 14,
                  padding: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.8)",
                  zIndex: 60,
                }}
              >
                {FLOWER_OPTIONS.map(f => {
                  const isSelected = flowerType === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={f.label}
                      title={f.label}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFlowerSelect(f.id);
                        setFlowerMenuOpen(false);
                      }}
                      style={{
                        width: 36,
                        height: 34,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        lineHeight: 1,
                        borderRadius: 10,
                        cursor: "pointer",
                        padding: 0,
                        background: isSelected ? "rgba(255, 255, 255, 0.16)" : "transparent",
                        border: isSelected ? "1px solid rgba(255, 255, 255, 0.22)" : "1px solid transparent",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {f.icon}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}