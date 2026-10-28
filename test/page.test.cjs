const { test } = require("node:test"), assert = require("node:assert/strict");
const { filePage } = require("../file-page.cjs");
test("large scans transfer at most 120 UI rows and no cleanup metadata", () => {
  const files = Array.from({ length: 1e5 }, (_, i) => ({ id: String(i), name: "file" + i, path: "C:\\data\\file" + i, size: i, kind: i % 2 ? "duplicate" : "review", mtime: 123, ino: 99, dev: 1 }));
  const page = filePage(files, "all", 120, 99999);
  assert.equal(page.count, 1e5);
  assert.equal(page.rows.length, 120);
  assert.equal(page.rows[0].id, "120");
  assert(!("mtime" in page.rows[0]));
  const copies = filePage(files, "duplicate", 0);
  assert.equal(copies.count, 5e4);
  assert.equal(copies.rows.length, 120);
  assert(copies.rows.every((f) => f.kind === "duplicate"));
  assert.throws(() => filePage(files, "unknown"));
});
