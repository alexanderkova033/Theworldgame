// The same thing always goes by the same name (see src/presentation/glossary.ts).
// Scans the text the player reads in the UI and in the simulation's
// messages: string literals that look like words (a space, or a capital
// letter), template text outside its ${...} parts, and JSX text. Code
// comments and plain identifiers like type="popularity" are skipped.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLOSSARY } from "../src/presentation/glossary";

const ROOTS = ["src/presentation", "src/application", "src/App.tsx"];

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

// Drops every ${...} (and any template nested inside it), counting braces.
function withoutInterpolations(code: string): string {
  let out = "";
  for (let i = 0; i < code.length; i++) {
    if (code[i] === "$" && code[i + 1] === "{") {
      let depth = 0;
      for (i++; i < code.length; i++) {
        if (code[i] === "{") depth++;
        else if (code[i] === "}" && --depth === 0) break;
      }
      out += " ";
    } else out += code[i];
  }
  return out;
}

function playerText(source: string): string[] {
  const code = withoutInterpolations(source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1"));
  const texts: string[] = [];
  for (const match of code.matchAll(/"([^"\n]*)"|`([^`]*)`|>([^<>{}]+)</g)) {
    // Between > and < can also be code (a comparison); real text has no ; = or quotes.
    if (match[3] !== undefined && /[;="]/.test(match[3])) continue;
    const text = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (text && (/\s/.test(text) || /^[A-Z]/.test(text))) texts.push(text);
  }
  return texts;
}

const sources = ROOTS.flatMap(files)
  .filter((file) => /\.tsx?$/.test(file) && !file.endsWith("glossary.ts"))
  .map((file) => ({ file, texts: playerText(readFileSync(file, "utf8")) }));

describe("the player's vocabulary", () => {
  it.each(GLOSSARY.map((term) => [term.use, term] as const))("says %s", (_, term) => {
    const misses = sources.flatMap(({ file, texts }) =>
      texts.filter((text) => term.notThese.some((word) => word.test(text))).map((text) => `${file}: ${text.slice(0, 80)}`),
    );
    expect(misses).toEqual([]);
  });
});
