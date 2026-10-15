"use client";

import { useEffect, useState } from "react";
import { FLOWERS, TINTS } from "../constants/garden";

export interface PresenceUser {
  id: string;
  n: string;
  c: string;
}

export function usePresence() {
  const [gardenersCount, setGardenersCount] = useState<number>(1);
  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);

  useEffect(() => {
    const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const user: PresenceUser = {
      id: Math.random().toString(36).slice(2, 10),
      n: pick(FLOWERS),
      c: pick(TINTS),
    };
    setCurrentUser(user);

    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    try {
      const bc = new BroadcastChannel("tg-live");
      const roster = new Map<string, { n: string; c: string; t: number }>();

      const publish = () => {
        const now = Date.now();
        for (const [k, v] of roster) {
          if (now - v.t > 3500) roster.delete(k);
        }
        setGardenersCount(Math.max(1, roster.size));
      };

      const beat = () => {
        roster.set(user.id, { n: user.n, c: user.c, t: Date.now() });
        bc.postMessage({ k: "hello", id: user.id, n: user.n, c: user.c });
        publish();
      };

      bc.onmessage = ({ data: d }) => {
        if (!d || typeof d !== "object") return;
        if (d.k === "hello") {
          roster.set(d.id, { n: d.n, c: d.c, t: Date.now() });
          publish();
        } else if (d.k === "bye") {
          roster.delete(d.id);
          publish();
        }
      };

      beat();
      const interval = setInterval(beat, 1000);

      return () => {
        clearInterval(interval);
        try {
          bc.postMessage({ k: "bye", id: user.id });
          bc.close();
        } catch {}
      };
    } catch {}
  }, []);

  return { gardenersCount, currentUser };
}
