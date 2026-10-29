import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Photos dropped into /public/hero (jpg/png/webp), sorted by file name. Read at build time.
 * A file whose name starts with "you" goes in the small self-view window.
 */
export function getHeroPhotos(): { strangers: string[]; you: string | null } {
  const all = listPhotos();
  return {
    strangers: all.filter((f) => !/^\/hero\/you/i.test(f)),
    you: all.find((f) => /^\/hero\/you/i.test(f)) ?? null,
  };
}

function listPhotos(): string[] {
  try {
    const dir = path.join(process.cwd(), "public", "hero");
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f) => `/hero/${f}`);
  } catch {
    return [];
  }
}
