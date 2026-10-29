"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { countryFlag, countryName } from "@/lib/countries";

// Illustrative only. Photo N in /public/hero (sorted by name) pairs with entry N here.
// Photos: AI-generated people (not real), CC0 — github.com/faker-js/assets-person-portrait
const REEL = [
  { country: "CA", line: "Hi! Greetings from Toronto" },
  { country: "BR", line: "Oi! Hi from São Paulo!" },
  { country: "JP", line: "What time is it there?" },
  { country: "LK", line: "Practising my English, be patient!" },
  { country: "IE", line: "Hiya! Where are you from?" },
  { country: "NL", line: "Next or stay? Stay." },
];

/**
 * The hero's one moving part: a reel of strangers, like the spin itself.
 * `photos` = files found in /public/hero (see README). Missing photos fall back to silhouettes.
 */
export function StrangerShuffle({ strangers: photos = [], you = null }: { strangers?: string[]; you?: string | null }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % REEL.length), 2200);
    return () => clearInterval(t);
  }, []);
  const s = REEL[i];

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px]" aria-hidden>
      {/* Stranger window */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-dusk">
        <div
          key={i}
          className="absolute inset-0 animate-[spin-in_0.5s_cubic-bezier(.2,.8,.2,1)]"
          style={{
            background: `radial-gradient(120% 90% at ${30 + ((i * 17) % 40)}% 30%, ${HUES[i % HUES.length]} 0%, transparent 60%), radial-gradient(90% 70% at 70% 90%, #3a2852 0%, transparent 70%)`,
          }}
        >
          {photos[i % Math.max(photos.length, 1)] && photos.length > 0 ? (
            <Image
              src={photos[i % photos.length]}
              alt=""
              fill
              sizes="(min-width: 768px) 420px, 90vw"
              priority={i === 0}
              className="object-cover"
            />
          ) : (
            <>
              {/* Abstract head-and-shoulders silhouette */}
              <div className="absolute bottom-0 left-1/2 h-[42%] w-[72%] -translate-x-1/2 rounded-t-[50%] bg-plum/70" />
              <div className="absolute bottom-[34%] left-1/2 h-[30%] w-[38%] -translate-x-1/2 rounded-full bg-plum/70" />
            </>
          )}
          {/* Keeps the name tag and bubble readable over any photo */}
          {photos.length > 0 && <div className="absolute inset-0 bg-gradient-to-t from-plum-deep/60 via-transparent to-plum-deep/30" />}
        </div>
        <div className="absolute left-4 top-4 rounded-full bg-plum-deep/70 px-3 py-1 text-sm backdrop-blur">
          {countryFlag(s.country)} {countryName(s.country)}
          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-signal" />
        </div>
        <p key={`l${i}`} className="absolute bottom-5 left-4 max-w-[70%] animate-[spin-in_0.5s_0.15s_both] rounded-2xl rounded-bl-sm bg-dusk-2 px-3 py-1.5 text-[15px]">
          {s.line}
        </p>
      </div>
      {/* You */}
      <div className="absolute -bottom-6 -right-4 aspect-[3/4] w-[34%] overflow-hidden rounded-2xl border-4 border-plum bg-dusk-2 shadow-2xl md:-right-8">
        {you ? (
          <Image src={you} alt="" fill sizes="160px" className="object-cover" />
        ) : (
          <>
            <div className="absolute bottom-0 left-1/2 h-[40%] w-[80%] -translate-x-1/2 rounded-t-[50%] bg-coral/60" />
            <div className="absolute bottom-[32%] left-1/2 h-[30%] w-[44%] -translate-x-1/2 rounded-full bg-coral/60" />
          </>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-plum-deep/60 px-1.5 text-xs font-semibold">You</span>
      </div>
    </div>
  );
}

const HUES = ["#ff5a7a55", "#46e3d055", "#ffb44f55", "#9b7bff55", "#ff8f5a55", "#4fb4ff55"];
