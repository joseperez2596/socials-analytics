// Run: npm test   (Node 22+, strips TS types from the import)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv-parser.ts";

test("parses headers, quoted commas, escaped quotes and CRLF", () => {
  const { headers, rows } = parseCsv('title,views\r\n"Hello, world",10\r\n"She said ""hi""",5\r\n');
  assert.deepEqual(headers, ["title", "views"]);
  assert.deepEqual(rows, [
    { title: "Hello, world", views: "10" },
    { title: 'She said "hi"', views: "5" },
  ]);
});

test("empty input and blank rows", () => {
  assert.deepEqual(parseCsv(""), { headers: [], rows: [] });
  assert.equal(parseCsv("a,b\n\n1,2\n,\n").rows.length, 1);
  assert.deepEqual(parseCsv("a,b\n1").rows, [{ a: "1", b: "" }]);
});

import { classifyByKeywords, suggestKeywords } from "./pillars/classify.ts";

test("classify: first matching pillar wins, case-insensitive, else Other", () => {
  const map = { Pilates: ["pilates"], Routines: ["rutina"] };
  assert.equal(classifyByKeywords("Rutina de PILATES en casa", map), "Pilates");
  assert.equal(classifyByKeywords("Mi rutina de noche", map), "Routines");
  assert.equal(classifyByKeywords("Esta es mi nueva obsesión", map), "Other");
});

test("suggest: skips filler words, counts once per post, keeps accents", () => {
  const s = suggestKeywords(["Ejercicios de glúteo sin equipo", "EJERCICIOS para glúteo glúteo", "the day 2026"]);
  assert.deepEqual(s.slice(0, 2), [["ejercicios", 2], ["glúteo", 2]]);
  const all = s.map(([w]) => w);
  for (const w of ["de", "sin", "para", "the", "2026"]) assert.ok(!all.includes(w), w);
});
