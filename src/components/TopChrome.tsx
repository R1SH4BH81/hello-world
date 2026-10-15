"use client";

import React, { useState } from "react";

interface TopChromeProps {
  mode: "type" | "poster";
  onModeChange: (mode: "type" | "poster") => void;
}

export function TopChrome({ mode, onModeChange }: TopChromeProps) {
  const [copied, setCopied] = useState(false);
  const [coffeeActive, setCoffeeActive] = useState(false);
  const [coffeePressed, setCoffeePressed] = useState(false);

  const handleCopyCode = async () => {
    try {
      const r = await fetch("/source.txt");
      const txt = await r.text();
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {/* Top Left: Copy code & Coffee (hidden in poster mode) */}
      <div id="tg-copy" hidden={mode === "poster"} className={copied ? "on" : ""}>
        <div className="row">
          <div className="pill">
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copies the source with a short brief. Paste it into Claude to make your own."
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          <div className="note" aria-live="polite">
            Paste it into Claude to grow your own
          </div>
        </div>
      </div>

      {/* Top Right: Mode Segmented Pill */}
      <div
        data-tg="modes"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 5,
          display: "flex",
          gap: 4,
          padding: 4,
          border: "1px solid #2A2A2A",
          borderRadius: 999,
          background: "#000",
        }}
      >
        <button
          onClick={() => onModeChange("type")}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "7px 14px",
            font: "inherit",
            fontSize: 12,
            letterSpacing: "0.04em",
            cursor: "pointer",
            background: mode === "type" ? "#FFFFFF" : "transparent",
            color: mode === "type" ? "#000000" : "#BDBDBD",
            transition: "all 0.15s ease",
          }}
        >
          Type
        </button>
        <button
          onClick={() => onModeChange("poster")}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "7px 14px",
            font: "inherit",
            fontSize: 12,
            letterSpacing: "0.04em",
            cursor: "pointer",
            background: mode === "poster" ? "#FFFFFF" : "transparent",
            color: mode === "poster" ? "#000000" : "#BDBDBD",
            transition: "all 0.15s ease",
          }}
        >
          Poster
        </button>
      </div>
    </>
  );
}
