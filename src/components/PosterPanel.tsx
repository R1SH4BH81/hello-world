"use client";

import React from "react";
import { PRESETS, MotionPreset } from "../constants/presets";
import { PALETTES } from "../constants/palettes";

export type PosterOrientation = "landscape" | "portrait" | "square";

interface PosterPanelProps {
  posterText: string;
  onPosterTextChange: (text: string) => void;
  onRegrow: () => void;
  orientation: PosterOrientation;
  onOrientationChange: (orient: PosterOrientation) => void;
  currentPreset: string;
  onPresetChange: (presetId: string) => void;
  paletteIdx: number;
  onPaletteChange: (idx: number) => void;
  onExportVideo: () => void;
  onExportFrames: () => void;
  busy: boolean;
  videoSupported: boolean;
  videoMime: string | null;
  statusText: string;
  currentPresetObj: MotionPreset;
  posterWidth: number;
  posterHeight: number;
}

export function PosterPanel({
  posterText,
  onPosterTextChange,
  onRegrow,
  orientation,
  onOrientationChange,
  currentPreset,
  onPresetChange,
  paletteIdx,
  onPaletteChange,
  onExportVideo,
  onExportFrames,
  busy,
  videoSupported,
  videoMime,
  statusText,
  currentPresetObj,
  posterWidth,
  posterHeight,
}: PosterPanelProps) {
  const aspectLabel =
    orientation === "landscape"
      ? "16:9 Landscape"
      : orientation === "portrait"
      ? "9:16 Portrait"
      : "1:1 Square";

  return (
    <div
      data-tg="panel"
      style={{
        borderRight: "1px solid #1E1E1E",
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 22px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: "#0A0A0A",
      }}
    >
      {/* Title & Loop Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontFamily: "'GT Ultra','Playfair Display',serif",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 0,
            color: "#FFFFFF",
          }}
        >
          Poster
        </div>
        <div style={{ color: "#8C8C8C", fontSize: 11 }}>
          {aspectLabel} · {currentPresetObj.T / 1000}s loop · 30 fps
        </div>
      </div>

      {/* Words Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ color: "#8C8C8C", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em" }}>
          Words
        </div>
        <input
          type="text"
          value={posterText}
          onChange={e => onPosterTextChange(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === "Enter") onRegrow();
          }}
          onKeyUp={e => e.stopPropagation()}
          placeholder="e.g. in bloom"
          spellCheck={false}
          autoComplete="off"
          style={{
            background: "#000",
            border: "1px solid #2A2A2A",
            borderRadius: 8,
            color: "#FFFFFF",
            fontFamily: "'GT Ultra','Playfair Display',serif",
            fontWeight: 700,
            fontSize: 22,
            padding: "10px 12px",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease",
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = "#FFFFFF";
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "#2A2A2A";
          }}
        />
        <button
          type="button"
          onClick={onRegrow}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "1px solid #2A2A2A",
            color: "#EDEDED",
            font: "inherit",
            fontSize: 12,
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            transition: "border-color 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#FFFFFF";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#2A2A2A";
          }}
        >
          Regrow garden
        </button>
      </div>

      {/* Orientation Selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ color: "#8C8C8C", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em" }}>
          Orientation
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            padding: 3,
            background: "#121212",
            borderRadius: 8,
            border: "1px solid #222222",
          }}
        >
          {(
            [
              { key: "landscape", label: "Landscape", ratio: "16:9" },
              { key: "portrait", label: "Portrait", ratio: "9:16" },
              { key: "square", label: "Square", ratio: "1:1" },
            ] as const
          ).map(({ key, label, ratio }) => {
            const isSelected = orientation === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onOrientationChange(key)}
                style={{
                  border: 0,
                  borderRadius: 6,
                  padding: "8px 4px",
                  font: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  background: isSelected ? "#FFFFFF" : "transparent",
                  color: isSelected ? "#000000" : "#A0A0A0",
                  fontWeight: isSelected ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 11.5 }}>{label}</span>
                <span style={{ fontSize: 9.5, opacity: isSelected ? 0.7 : 0.5 }}>{ratio}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Motion Presets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ color: "#8C8C8C", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em" }}>
          Motion
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PRESETS.map(p => {
            const isSelected = currentPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetChange(p.id)}
                style={{
                  textAlign: "left",
                  background: isSelected ? "#161616" : "transparent",
                  border: `1px solid ${isSelected ? "#FFFFFF" : "#2A2A2A"}`,
                  color: "#FFFFFF",
                  font: "inherit",
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#8C8C8C";
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#2A2A2A";
                }}
              >
                <span style={{ fontSize: 13 }}>{p.label}</span>
                <span style={{ color: "#8C8C8C", fontSize: 11 }}>{p.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette Preview Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ color: "#8C8C8C", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em" }}>
          Palette
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {PALETTES.map((p, idx) => {
            const isSelected = paletteIdx === idx;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onPaletteChange(idx)}
                aria-label={p.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "stretch",
                  background: "transparent",
                  border: `1px solid ${isSelected ? "#FFFFFF" : "#2A2A2A"}`,
                  color: "#EDEDED",
                  font: "inherit",
                  padding: "6px 6px 8px",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#8C8C8C";
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#2A2A2A";
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    borderRadius: 8,
                    background: p.bg,
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: p.flower }} />
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.stem, marginLeft: -4 }} />
                  <span
                    style={{
                      fontFamily: "'GT Ultra','Playfair Display',serif",
                      fontWeight: 700,
                      fontSize: 18,
                      color: p.text,
                      marginLeft: 8,
                    }}
                  >
                    Aa
                  </span>
                </span>
                <span style={{ padding: "0 4px", fontSize: 12 }}>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderTop: "1px solid #1E1E1E",
          paddingTop: 20,
        }}
      >
        <div style={{ color: "#8C8C8C", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em" }}>
          Export · {posterWidth} × {posterHeight} loop
        </div>
        <button
          type="button"
          onClick={onExportVideo}
          disabled={busy || !videoSupported}
          style={{
            background: "#FFFFFF",
            border: 0,
            color: "#000",
            font: "inherit",
            fontWeight: 500,
            padding: "12px 14px",
            borderRadius: 999,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {videoSupported
            ? busy
              ? "Exporting…"
              : `Export ${videoMime && videoMime.includes("mp4") ? "MP4" : "WebM"} loop`
            : "Video export unavailable"}
        </button>
        <button
          type="button"
          onClick={onExportFrames}
          disabled={busy}
          style={{
            background: "transparent",
            border: "1px solid #3A3A3A",
            color: "#EDEDED",
            font: "inherit",
            padding: "11px 14px",
            borderRadius: 999,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            if (!busy) e.currentTarget.style.borderColor = "#FFFFFF";
          }}
          onMouseLeave={e => {
            if (!busy) e.currentTarget.style.borderColor = "#3A3A3A";
          }}
        >
          PNG frames (.zip)
        </button>
        {statusText && <div style={{ color: "#8C8C8C", minHeight: 16 }}>{statusText}</div>}
      </div>
    </div>
  );
}
