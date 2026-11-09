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
