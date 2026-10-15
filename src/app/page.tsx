"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getPalette } from "../constants/palettes";
import { getPreset } from "../constants/presets";
import { FONT_FAMILY } from "../constants/garden";
import { FlowerType } from "../constants/flowers";
import { createRng, easeOutCubic } from "../lib/math";
import { createBackend } from "../lib/geometry";
import { Letter, drawFlowerPetals } from "../lib/garden-engine";
import { measureCharWidth, layoutCore } from "../lib/layout";
import { generateLetterGrowth, generateLetterEnd } from "../lib/growth";
import { renderGardenScene } from "../lib/scene-renderer";
import { ButterflyState, spawnButterfly, updateAndDrawButterflies } from "../lib/butterflies";
import { generateGardenSvg } from "../lib/svg-exporter";
import { PosterState, buildPosterLetters, posterDrawFrame } from "../lib/poster-engine";
import { downloadBlob, createZipBlob } from "../lib/export";
import { usePresence } from "../hooks/usePresence";
import { TopChrome } from "../components/TopChrome";
import { BottomBar } from "../components/BottomBar";
import { PosterPanel, PosterOrientation } from "../components/PosterPanel";

export default function Bloom() {
  const [mode, setMode] = useState<"type" | "poster">("type");
  const [preset, setPreset] = useState<string>("breathe");
  const [flowerType, setFlowerType] = useState<FlowerType>("rose");
  const [paletteIdx, setPaletteIdx] = useState<number>(0);
  const [posterText, setPosterText] = useState<string>("in bloom");
  const [seed, setSeed] = useState<number>(7);
  const [orientation, setOrientation] = useState<PosterOrientation>("landscape"); // Landscape as DEFAULT
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const handlePresetChange = useCallback((newPresetId: string) => {
    setPreset(newPresetId);
  }, []);

  const { gardenersCount } = usePresence();

  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const pcvRef = useRef<HTMLCanvasElement | null>(null);
  const inpRef = useRef<HTMLInputElement | null>(null);

  // Dimensions based on selected orientation
  const { posterWidth, posterHeight } = useMemo(() => {
    switch (orientation) {
      case "landscape":
        return { posterWidth: 1920, posterHeight: 1080 };
      case "portrait":
        return { posterWidth: 1080, posterHeight: 1920 };
      case "square":
      default:
        return { posterWidth: 1080, posterHeight: 1080 };
    }
  }, [orientation]);

  // Engine state refs
  const eng = useRef({
    letters: [] as Letter[],
    uid: 1,
    cache: {} as Record<string, number>,
    Sd: 0,
    St: 0,
    W: 0,
    H: 0,
    dpr: 1,
    cx: 0,
    cy: 0,
    ctx_: 0,
    cty: 0,
    wrapped: false,
    t0: 0,
    lastKey: 0,
    lt: 0,
    _fl: 0,
    _now: 0,
    pt0: 0,
    mx: null as number | null,
    my: null as number | null,
    fa: {} as Record<number, [number, number]>,
    flies: [] as ButterflyState[],
    perch: [] as any[],
    gifts: [] as any[],
    touch: false,
    ptype: "mouse",
    iv: "",
    composing: false,
    _kd: false,
    lastTap: null as { t: number; x: number; y: number } | null,
    lastPlant: 0,
    P: null as PosterState | null,
    vmime: null as string | null,
    _gl: null as any,
    _light: [540, 540] as [number, number],
    rand: Math.random as () => number,
    raf: 0,
    props: {
      boil: true,
      recoil: 20,
      density: 1,
      showHint: true,
    },
  });

  const S = eng.current;
  const currentPalette = getPalette(paletteIdx);
  const currentPresetObj = getPreset(preset);

  // Character measurement callback
  const mw = useCallback(
    (ch: string) => {
      const ctx = cvRef.current?.getContext("2d") || null;
      return measureCharWidth(ch, S.cache, ctx);
    },
    [S]
  );

  // Layout runner
  const layout = useCallback(
    (snap?: boolean) => {
      if (!S.W) return;
      const A = S.letters.filter(l => !l.dead);
      const res = layoutCore(A, S.W, S.H, S.wrapped, mw);
      S.wrapped = res.wrapped;
      A.forEach(l => {
        if (l.x == null) {
          l.x = l.tx;
          l.y = l.ty;
        }
      });
      const scale = res.S;
      const last = A[A.length - 1];
      S.St = scale;
      S.ctx_ = last && last.tx != null && last.tw != null ? last.tx + last.tw / 2 + 0.07 * scale : S.W / 2;
      S.cty = last && last.ty != null ? last.ty - 0.33 * scale : S.H / 2;
      if (snap || !S.Sd) {
        S.Sd = scale;
        S.cx = S.ctx_;
        S.cy = S.cty;
        A.forEach(l => {
          l.x = l.tx;
          l.y = l.ty;
        });
      }
    },
    [S, mw]
  );

  const resize = useCallback(() => {
    const c = cvRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    if (!r.width) return;
    S.W = r.width;
    S.H = r.height;
    S.dpr = d;
    c.width = Math.round(r.width * d);
    c.height = Math.round(r.height * d);
    layout(true);
  }, [S, layout]);

  // Letters growth generator
  const gen = useCallback(
    (l: Letter) => {
      generateLetterGrowth(l, mw, S.props.density, Math.floor(S.rand() * 1e6), flowerType);
    },
    [S, mw, flowerType]
  );

  const genEnd = useCallback(
    (l: Letter, rel: number) => {
      generateLetterEnd(l, rel, mw, S.props.density, Math.floor(S.rand() * 1e6), flowerType);
    },
    [S, mw, flowerType]
  );

  const addLetter = useCallback(
    (ch: string, now: number) => {
      const A = S.letters.filter(l => !l.dead);
      const last = A[A.length - 1];
      if (ch === " ") {
        if (last && last.ch !== " ") {
          last.cut = now;
          genEnd(last, now - (last.birth || now));
        }
        S.letters.push({ ch: " ", id: S.uid++, birth: now, els: [] });
        layout();
        return;
      }
      const prevL = last && last.ch !== " " ? last : null;
      const l: Letter = {
        ch,
        id: S.uid++,
        birth: now,
        tb: now,
        ws: prevL ? prevL.ws : Math.floor(S.rand() * 1e9),
        wi: prevL ? (prevL.wi || 0) + 1 : 0,
        prev: prevL,
        flowerType,
      };
      gen(l);
      S.letters.push(l);
      layout();
    },
    [S, gen, genEnd, layout, flowerType]
  );

  const witherLetter = useCallback(
    (now: number) => {
      const A = S.letters.filter(l => !l.dead);
      const last = A[A.length - 1];
      if (!last) return;
      last.dead = now;
      const pv = A[A.length - 2];
      if (pv && pv.ch !== " ") {
        pv.cut = null;
        pv.endEls = null;
        pv.tb = now;
      }
      layout();
    },
    [S, layout]
  );

  const nearPointer = useCallback(
    (x: number, y: number): [number, number] | null => {
      if (S.mx == null) return null;
      return [S.mx, S.my!];
    },
    [S]
  );

  // Paint Interactive Type Scene
  const paintTypeScene = useCallback(
    (now: number, showCaret: boolean) => {
      if (!cvRef.current) return;
      const g = cvRef.current.getContext("2d");
      if (!g) return;
      const d = S.dpr,
        pal = currentPalette;
      g.setTransform(d, 0, 0, d, 0, 0);
      g.fillStyle = pal.bg;
      g.fillRect(0, 0, S.W, S.H);

      const backend = createBackend(g);
      S.perch = [];

      renderGardenScene(backend, now, {
        letters: S.letters,
        S: S.Sd,
        C: pal.colors,
        boil: S.props.boil,
        recoil: S.props.recoil,
        speed: 1,
        wither: 260,
        face: true,
        nearPointer,
        fa: S.fa,
        perchList: S.perch,
        flowerType,
      });

      // Update and draw flutter butterflies
      const dt = Math.min(48, now - (S._fl || now));
      S._fl = now;
      S.flies = updateAndDrawButterflies(backend, S.flies, S.perch, S.W, S.H, now, dt, pal.colors);

      // Render gifted flowers from double taps
      if (showCaret && S.gifts && S.gifts.length) {
        const LIFE = 60000;
        S.gifts = S.gifts.filter(gf => now - gf.t0 < LIFE);
        for (const gf of S.gifts) {
          const age = now - gf.t0,
            w = 1 - easeOutCubic((age - (LIFE - 2200)) / 2200);
          g.globalAlpha = Math.max(0, w);
          drawFlowerPetals(
            gf.flowerType || flowerType,
            backend,
            gf.x * S.W,
            gf.y * S.H + (1 - w) * S.Sd * 0.3,
            S.Sd * 0.24 * (0.65 + 0.35 * w),
            gf.rot + (1 - w) * 0.6,
            gf.e,
            age,
            null,
            pal.colors
          );
        }
        g.globalAlpha = 1;
      }

      const hasLetters = S.letters.some(l => !l.dead);

      // Placeholder when no letters have been typed
      if (!hasLetters && showCaret) {
        const pSize = Math.min(Math.max(22, S.W * 0.04), S.H * 0.075, 42);
        const pText = "type something...";
        g.font = `italic 400 ${pSize}px ${FONT_FAMILY}`;
        const pWidth = g.measureText(pText).width;
        const gap = Math.max(6, Math.round(pSize * 0.22));
        const cWidth = Math.max(2, Math.round(pSize * 0.05));
        const totalW = pWidth + gap + cWidth;

        const startX = S.W / 2 - totalW / 2;
        const cursorX = startX + cWidth / 2;
        const textX = startX + cWidth + gap;
        const centerY = S.H / 2;

        g.save();
        g.font = `italic 400 ${pSize}px ${FONT_FAMILY}`;
        g.textAlign = "left";
        g.textBaseline = "middle";
        g.fillStyle = pal.colors.text;
        g.globalAlpha = 0.32;
        g.fillText(pText, textX, centerY);
        g.restore();

        // Blinking cursor positioned before the placeholder
        const on = now - S.lastKey < 500 || Math.floor(now / 530) % 2 === 0;
        const hf = easeOutCubic((now - S.t0) / 600);
        if (on && hf > 0) {
          const cHeight = pSize * 0.95 * hf;
          backend.rect(cursorX - cWidth / 2, centerY - cHeight / 2, cWidth, cHeight, pal.colors.text);
        }
      } else if (showCaret) {
        // Blinking cursor during typing
        const scale = S.Sd;
        const on = now - S.lastKey < 500 || Math.floor(now / 530) % 2 === 0;
        const hf = easeOutCubic((now - S.t0) / 600);
        if (on && hf > 0) {
          const hVal = 0.8 * scale * hf,
            wVal = Math.max(2, scale * 0.03);
          backend.rect(S.cx - wVal / 2, S.cy - hVal / 2, wVal, hVal, pal.colors.text);
        }
      }
    },
    [S, currentPalette, nearPointer, flowerType]
  );

  // Build and draw poster loop
  const buildPoster = useCallback(() => {
    S.P = buildPosterLetters(
      posterText,
      preset,
      seed,
      posterWidth,
      posterHeight,
      mw,
      S.props.density,
      flowerType
    );
    S.pt0 = performance.now();
  }, [posterText, preset, seed, posterWidth, posterHeight, S, mw, flowerType]);

  const handleRegrow = useCallback(() => {
    const newRandSeed = Math.floor(Math.random() * 1e6);
    setSeed(newRandSeed);

    if (S.letters.length > 0) {
      const now = performance.now();
      let currentWs = Math.floor(Math.random() * 1e9);

      for (let i = 0; i < S.letters.length; i++) {
        const l = S.letters[i];
        if (l.ch === " ") {
          currentWs = Math.floor(Math.random() * 1e9);
          continue;
        }
        l.ws = currentWs;
        l.birth = now;
        l.tb = now;
        l.dead = null;
        l.cut = null;
        if (flowerType && flowerType !== "wildflower") {
          l.flowerType = flowerType;
        }
        generateLetterGrowth(l, mw, S.props.density, newRandSeed + i * 37, flowerType);

        const nx = S.letters[i + 1];
        if (!nx || nx.ch === " ") {
          generateLetterEnd(l, 40, mw, S.props.density, newRandSeed + i * 37 + 101, flowerType);
        }
      }
      S.gifts = [];
      S.perch = [];
      layout();
      const live = S.letters.filter(l => !l.dead).map(l => l.ch).join("");
      S.iv = live;
      if (inpRef.current) inpRef.current.value = live;
    }

    if (mode === "poster") {
      buildPoster();
    }

    if (mode === "type" && S.ptype === "mouse" && inpRef.current) {
      inpRef.current.focus({ preventScroll: true });
    }
  }, [S, mw, flowerType, layout, mode, buildPoster]);

  const posterDraw = useCallback(
    (g: CanvasRenderingContext2D, t: number) => {
      if (!S.P) return;
      posterDrawFrame(
        g,
        t,
        S.P,
        currentPalette,
        S.props,
        S._light,
        (lx, ly) => {
          S._light[0] = lx;
          S._light[1] = ly;
        }
      );
    },
    [S, currentPalette]
  );

  // Save PNG
  const handleSavePNG = () => {
    if (!cvRef.current) return;
    paintTypeScene(performance.now(), false);
    cvRef.current.toBlob(b => b && downloadBlob(b, "bloom.png"));
  };

  // Save SVG
  const handleSaveSVG = () => {
    if (!S._gl) {
      fetch("/glyphs.json")
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
        .then(j => {
          S._gl = j;
          handleSaveSVG();
        });
      return;
    }
    const svg = generateGardenSvg(
      S.letters,
      S.Sd,
      currentPalette,
      S.W,
      S.H,
      S._gl,
      S.props
    );
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "bloom.svg");
  };

  // Export Video
  const handleExportVideo = async () => {
    if (!S.vmime || busy) {
      setStatus("Video export isn’t supported in this browser — use PNG frames.");
      return;
    }
    const P = S.P;
    if (!P) return;
    const c = document.createElement("canvas");
    c.width = P.W;
    c.height = P.H;
    const g = c.getContext("2d")!;
    const stream = (c as any).captureStream ? (c as any).captureStream(0) : null;
    if (!stream) {
      setStatus("captureStream not supported in this browser");
      return;
    }
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: S.vmime, videoBitsPerSecond: 14e6 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
    const done = new Promise(r => {
      rec.onstop = r;
    });

    setBusy(true);
    setStatus("Recording…");
    posterDraw(g, 0);
    rec.start();

    const N = Math.round((P.T / 1000) * 30);
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const t0 = performance.now();

    for (let i = 0; i < N; i++) {
      posterDraw(g, (i * 1000) / 30);
      if (track && typeof (track as any).requestFrame === "function") {
        (track as any).requestFrame();
      }
      if (i % 15 === 0) setStatus(`Recording ${Math.round((i / N) * 100)}%`);
      const target = t0 + ((i + 1) * 1000) / 30;
      await wait(Math.max(0, target - performance.now()));
    }
    rec.stop();
    await done;
    const ext = S.vmime.includes("mp4") ? "mp4" : "webm";
    const fname = `bloom-${(posterText || "loop")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 24)}-${preset}-${orientation}`;
    downloadBlob(new Blob(chunks, { type: S.vmime.split(";")[0] }), `${fname}.${ext}`);
    setBusy(false);
    setStatus(`Saved ${ext.toUpperCase()} · ${N} frames`);
  };

  // Export PNG Frames ZIP
  const handleExportFrames = async () => {
    if (busy) return;
    const P = S.P;
    if (!P) return;
    const c = document.createElement("canvas");
    c.width = P.W;
    c.height = P.H;
    const g = c.getContext("2d")!;
    const N = Math.round((P.T / 1000) * 30);
    const files: { name: string; data: Uint8Array }[] = [];
    setBusy(true);
    setStatus("Rendering frames…");

    for (let i = 0; i < N; i++) {
      posterDraw(g, (i * 1000) / 30);
      const b: Blob | null = await new Promise(r => c.toBlob(r, "image/png"));
      if (b) {
        files.push({
          name: `frame_${String(i + 1).padStart(4, "0")}.png`,
          data: new Uint8Array(await b.arrayBuffer()),
        });
      }
      if (i % 10 === 0) setStatus(`Rendering ${Math.round((i / N) * 100)}%`);
    }
    const fname = `bloom-${(posterText || "loop")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 24)}-${preset}-${orientation}`;
    downloadBlob(createZipBlob(files), `${fname}-frames.zip`);
    setBusy(false);
    setStatus(`Saved ${N} PNG frames · 30 fps`);
  };

  // Main animation RAF loop
  useEffect(() => {
    const loop = () => {
      S.raf = requestAnimationFrame(loop);
      const now = performance.now(),
        dt = Math.min(64, now - (S.lt || now));
      S.lt = now;

      if (mode === "poster") {
        const c = pcvRef.current;
        if (c && !busy) {
          const g = c.getContext("2d");
          if (g) posterDraw(g, now - (S.pt0 || 0));
        }
        return;
      }

      const k = 1 - Math.exp(-dt / 80);
      S.Sd += (S.St - S.Sd) * k;
      S.cx += (S.ctx_ - S.cx) * k;
      S.cy += (S.cty - S.cy) * k;
      for (const l of S.letters) {
        if (!l.dead && l.tx != null && l.ty != null) {
          l.x = (l.x ?? l.tx) + (l.tx - (l.x ?? l.tx)) * k;
          l.y = (l.y ?? l.ty) + (l.ty - (l.y ?? l.ty)) * k;
        }
      }
      S.letters = S.letters.filter(l => !(l.dead && now - l.dead > 300));
      paintTypeScene(now, true);
    };
    S.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(S.raf);
  }, [mode, busy, S, posterDraw, paintTypeScene]);

  // Lifecycle & Keyboard / Pointer listeners
  useEffect(() => {
    S.t0 = performance.now();
    S.touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (S.touch) document.documentElement.setAttribute("data-touch", "");

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const onKey = (e: KeyboardEvent) => {
      if (mode !== "type") return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          e.shiftKey ? handleSaveSVG() : handleSavePNG();
        }
        return;
      }
      if (e.target && (e.target as HTMLElement).tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
      const now = performance.now();
      const A = S.letters.filter(l => !l.dead),
        last = A[A.length - 1];
      if (e.key === "Backspace") {
        e.preventDefault();
        S.lastKey = now;
        S._kd = true;
        setTimeout(() => {
          S._kd = false;
        }, 50);
        if (!last) return;
        last.dead = now;
        const pv = A[A.length - 2];
        if (pv && pv.ch !== " ") {
          pv.cut = null;
          pv.endEls = null;
          pv.tb = now;
        }
        layout();
        const live = S.letters.filter(l => !l.dead).map(l => l.ch).join("");
        S.iv = live;
        if (inpRef.current) inpRef.current.value = live;
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        S.lastKey = now;
        S._kd = true;
        setTimeout(() => {
          S._kd = false;
        }, 50);
        S.letters = [];
        S.iv = "";
        if (inpRef.current) inpRef.current.value = "";
        layout();
        return;
      }
      if (e.key.length !== 1) return;
      e.preventDefault();
      S.lastKey = now;
      S._kd = true;
      setTimeout(() => {
        S._kd = false;
      }, 50);
      addLetter(e.key, now);
      const live = S.letters.filter(l => !l.dead).map(l => l.ch).join("");
      S.iv = live;
      if (inpRef.current) inpRef.current.value = live;
    };
    window.addEventListener("keydown", onKey);

    const onMove = (e: PointerEvent) => {
      S.mx = e.clientX;
      S.my = e.clientY;
    };
    const onLeave = () => {
      S.mx = null;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    const onPD = (e: PointerEvent) => {
      S.ptype = e.pointerType || "mouse";
    };
    window.addEventListener("pointerdown", onPD, true);

    const onUp = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") S.mx = null;
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    // Double-tap/click plants a gift rose
    const onPlant = (e: PointerEvent) => {
      if (mode !== "type" || e.target !== cvRef.current) return;
      const now = performance.now(),
        lp = S.lastTap;
      S.lastTap = { t: now, x: e.clientX, y: e.clientY };
      if (
        lp &&
        now - lp.t < 340 &&
        Math.hypot(e.clientX - lp.x, e.clientY - lp.y) < 40 &&
        now - (S.lastPlant || 0) > 1800
      ) {
        S.lastPlant = now;
        S.lastTap = null;
        const g = {
          x: Math.round((e.clientX / S.W) * 1000) / 1000,
          y: Math.round((e.clientY / S.H) * 1000) / 1000,
          s: Math.floor(Math.random() * 1e6),
        };
        const rVal = createRng((g.s | 0) || 1);
        S.gifts.push({
          x: Math.min(1, Math.max(0, g.x)),
          y: Math.min(1, Math.max(0, g.y)),
          t0: performance.now(),
          rot: (rVal() - 0.5) * 0.8,
          e: { ph1: rVal() * 6.283, ph2: rVal() * 6.283, turns: 1.4 + rVal() * 0.5 },
        });
        if (S.gifts.length > 14) S.gifts.shift();
      }
    };
    window.addEventListener("pointerdown", onPlant);

    resize();

    if (document.fonts) {
      document.fonts
        .load(`700 100px ${FONT_FAMILY}`)
        .then(() => {
          S.cache = {};
          layout();
          buildPoster();
        })
        .catch(() => {});
      document.fonts.load(`italic 400 32px ${FONT_FAMILY}`).catch(() => {});
    }

    S.vmime =
      typeof MediaRecorder !== "undefined"
        ? [
            "video/mp4;codecs=avc1.42E01E",
            "video/mp4",
            "video/webm;codecs=vp9",
            "video/webm",
          ].find(m => MediaRecorder.isTypeSupported(m)) || null
        : null;

    buildPoster();
    const initLive = S.letters.filter(l => !l.dead).map(l => l.ch).join("");
    S.iv = initLive;
    if (inpRef.current) inpRef.current.value = initLive;
    if (!S.touch && inpRef.current) inpRef.current.focus({ preventScroll: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onPD, true);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerdown", onPlant);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme tokens when palette changes
  useEffect(() => {
    const ds = document.documentElement.style;
    ds.setProperty("--tg-flower", currentPalette.flower);
    ds.setProperty("--tg-stem", currentPalette.stem);
    ds.setProperty("--tg-detail", currentPalette.line);
    buildPoster();
  }, [paletteIdx, currentPalette, buildPoster]);

  // Rebuild poster when preset, orientation, posterText, flowerType, or seed changes
  useEffect(() => {
    buildPoster();
  }, [preset, orientation, posterText, seed, flowerType, buildPoster]);

  return (
    <div
      data-tg="app"
      style={{
        position: "fixed",
        inset: 0,
        background: currentPalette.bg,
        cursor: mode === "type" ? "text" : "default",
        fontFamily: "'DM Mono', ui-monospace, monospace",
      }}
      onPointerDown={e => {
        if (mode !== "type" || !inpRef.current) return;
        const isTouch = e.pointerType && e.pointerType !== "mouse";
        const onCanvas = e.target === cvRef.current;
        if (!isTouch) {
          inpRef.current.focus({ preventScroll: true });
          const len = inpRef.current.value.length;
          inpRef.current.setSelectionRange(len, len);
        }
        if (onCanvas) {
          S.flies.push(spawnButterfly(S.flies, S.perch, e.clientX, e.clientY, S.W, S.H, S.Sd));
        }
      }}
      onClick={e => {
        if (mode === "type" && inpRef.current && S.ptype !== "mouse" && e.target === cvRef.current) {
          inpRef.current.focus({ preventScroll: true });
          const len = inpRef.current.value.length;
          inpRef.current.setSelectionRange(len, len);
        }
      }}
    >
      {/* Type View Canvas */}
      <canvas
        ref={cvRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: mode === "type" ? "block" : "none",
        }}
      />

      {/* Hidden input for keyboard capture */}
      <input
        ref={inpRef}
        data-tg="input"
        aria-label="Type to grow a garden"
        placeholder="type something..."
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        defaultValue=""
        onInput={e => {
          if (mode !== "type" || S._kd) return;
          const cur = e.currentTarget.value;
          const old = S.iv ?? "";

          let p = 0;
          while (p < old.length && p < cur.length && old[p] === cur[p]) p++;

          let s = 0;
          while (
            s < old.length - p &&
            s < cur.length - p &&
            old[old.length - 1 - s] === cur[cur.length - 1 - s]
          ) {
            s++;
          }

          const dels = old.length - p - s;
          const ins = cur.slice(p, cur.length - s);

          const now = performance.now();
          S.lastKey = now;

          for (let i = 0; i < dels; i++) witherLetter(now);
          for (const ch of ins) {
            if (ch.charCodeAt(0) === 10) {
              S.letters = [];
              layout();
            } else {
              addLetter(ch, now);
            }
          }

          S.iv = cur;
        }}
        onCompositionStart={() => {
          S.composing = true;
        }}
        onCompositionEnd={() => {
          S.composing = false;
        }}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          margin: 0,
          padding: 0,
          border: 0,
          opacity: 0,
          fontSize: 16,
          color: "transparent",
          background: "transparent",
          caretColor: "transparent",
          pointerEvents: "none",
        }}
      />

      {/* Top Chrome */}
      <TopChrome
        mode={mode}
        onModeChange={newMode => {
          if (newMode === "poster") {
            const currentLiveText = S.letters
              .filter(l => !l.dead)
              .map(l => l.ch)
              .join("")
              .trim();
            if (currentLiveText) setPosterText(currentLiveText);
          }
          setMode(newMode);
          if (newMode === "type") {
            setTimeout(() => {
              resize();
              const live = S.letters.filter(l => !l.dead).map(l => l.ch).join("");
              S.iv = live;
              if (inpRef.current) {
                inpRef.current.value = live;
                inpRef.current.focus({ preventScroll: true });
                const len = live.length;
                inpRef.current.setSelectionRange(len, len);
              }
            }, 50);
          }
        }}
      />

      {/* Bottom Bar Hints & Controls (Type mode) */}
      {mode === "type" && (
        <BottomBar
          paletteIdx={paletteIdx}
          textColor={currentPalette.colors.text}
          bgColor={currentPalette.bg}
          gardenersCount={gardenersCount}
          flowerType={flowerType}
          onPaletteSelect={idx => {
            setPaletteIdx(idx);
            if (S.ptype === "mouse" && inpRef.current) inpRef.current.focus({ preventScroll: true });
          }}
          onFlowerSelect={flw => {
            setFlowerType(flw);
            for (const l of S.letters) {
              if (!l.dead && l.ch !== " ") {
                l.flowerType = flw;
                if (l.els) {
                  for (const el of l.els) {
                    if (el.t === "rose") (el as any).flowerType = flw;
                  }
                }
                if (l.endEls) {
                  for (const el of l.endEls) {
                    if (el.t === "rose") (el as any).flowerType = flw;
                  }
                }
              }
            }
            if (S.ptype === "mouse" && inpRef.current) inpRef.current.focus({ preventScroll: true });
          }}
          onRegrow={handleRegrow}
          onSavePNG={handleSavePNG}
          onSaveSVG={handleSaveSVG}
        />
      )}

      {/* Poster Mode Panel & Stage */}
      {mode === "poster" && (
        <div
          data-tg="poster"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "minmax(280px, 350px) minmax(0, 1fr)",
            background: "#000",
            cursor: "default",
            color: "#EDEDED",
            fontSize: 12,
            letterSpacing: "0.03em",
          }}
        >
          {/* Side Panel with Landscape (Default), Portrait, and Square Orientation */}
          <PosterPanel
            posterText={posterText}
            onPosterTextChange={setPosterText}
            onRegrow={handleRegrow}
            orientation={orientation}
            onOrientationChange={setOrientation}
            currentPreset={preset}
            onPresetChange={handlePresetChange}
            flowerType={flowerType}
            onFlowerChange={setFlowerType}
            paletteIdx={paletteIdx}
            onPaletteChange={setPaletteIdx}
            onExportVideo={handleExportVideo}
            onExportFrames={handleExportFrames}
            busy={busy}
            videoSupported={!!S.vmime}
            videoMime={S.vmime}
            statusText={status}
            currentPresetObj={currentPresetObj}
            posterWidth={posterWidth}
            posterHeight={posterHeight}
          />

          {/* Center Stage Canvas (Fluid Smooth Transition between Landscape, Portrait, and Square) */}
          <div
            data-tg="stage"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "56px 32px 32px",
              minWidth: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              className="tg-stage-viewport"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                aspectRatio:
                  orientation === "landscape"
                    ? "16 / 9"
                    : orientation === "portrait"
                    ? "9 / 16"
                    : "1 / 1",
                width:
                  orientation === "landscape"
                    ? "min(100%, calc((100vh - 120px) * 16 / 9))"
                    : orientation === "portrait"
                    ? "calc((100vh - 120px) * 9 / 16)"
                    : "min(100%, calc(100vh - 120px))",
                height:
                  orientation === "portrait"
                    ? "calc(100vh - 120px)"
                    : orientation === "landscape"
                    ? "calc(min(100%, calc((100vh - 120px) * 16 / 9)) * 9 / 16)"
                    : "min(100%, calc(100vh - 120px))",
                maxHeight: "calc(100vh - 96px)",
                maxWidth: "100%",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)",
                background: currentPalette.bg,
              }}
            >
              <canvas
                ref={pcvRef}
                data-tg="pcanvas"
                width={posterWidth}
                height={posterHeight}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Refresh button outside the canvas in the stage container on bottom-right */}
            <button
              type="button"
              onClick={handleRegrow}
              title="Regrow garden (Refresh)"
              aria-label="Regrow garden"
              style={{
                position: "absolute",
                bottom: 24,
                right: 28,
                zIndex: 10,
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.06)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid #2A2A2A",
                color: "#CCCCCC",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.1) rotate(15deg)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.borderColor = "#FFFFFF";
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.borderColor = "#2A2A2A";
                e.currentTarget.style.color = "#CCCCCC";
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
