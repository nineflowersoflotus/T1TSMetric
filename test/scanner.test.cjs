const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { scan, inside, validateFile } = require("../scanner.cjs");
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "disk-companion-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
test("path containment rejects siblings and traversal", () => {
  assert(inside("C:\\a", "C:\\a\\b.txt"));
  assert(!inside("C:\\a", "C:\\ab\\b.txt"));
  assert(!inside("C:\\a", "C:\\a\\..\\b.txt"));
});
test("nested files, content duplicates, old temporary suggestions", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, "nested"));
  await fs.writeFile(path.join(root, "a.txt"), "same");
  await fs.writeFile(path.join(root, "nested", "b.txt"), "same");
  await fs.writeFile(path.join(root, "c.txt"), "diff");
  const temp = path.join(root, "old.tmp");
  await fs.writeFile(temp, "old temp file");
  await fs.utimes(temp, new Date(2e3, 0, 1), new Date(2e3, 0, 1));
  const r = await scan(root, { duplicates: true });
  assert.equal(r.files.length, 4);
  assert.equal(r.duplicateGroups, 1);
  assert.equal(r.files.filter((f) => f.kind === "duplicate").length, 1);
  assert.equal(r.files.find((f) => f.path === temp).kind, "temp");
  assert.equal(r.bytes, 25);
});
test("protected roots excluded and protected scan rejected", async (t) => {
  const root = await fixture(t);
  const protectedDir = path.join(root, "private");
  await fs.mkdir(protectedDir);
  await fs.writeFile(path.join(protectedDir, "a"), "secret");
  assert.equal((await scan(root, { protectedRoots: [protectedDir] })).files.length, 0);
  await assert.rejects(scan(protectedDir, { protectedRoots: [protectedDir] }));
});
test("junctions are skipped", async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await fs.writeFile(path.join(outside, "a"), "outside");
  try {
    await fs.symlink(outside, path.join(root, "link"), "junction");
  } catch (e) {
    if (e.code === "EPERM") {
      t.skip("Windows sandbox n\xE3o permite criar junctions");
      return;
    }
    throw e;
  }
  assert.equal((await scan(root)).files.length, 0);
});
test("file identity checked before cleanup", async (t) => {
  const root = await fixture(t);
  const p = path.join(root, "a");
  await fs.writeFile(p, "hello");
  const f = (await scan(root)).files[0];
  await validateFile(f, root);
  await fs.writeFile(p, "changed");
  await assert.rejects(validateFile(f, root));
  await assert.rejects(validateFile(f, path.join(root, "other")));
});
test("scan limit reports partial results", async (t) => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, "a"), "a");
  await fs.writeFile(path.join(root, "b"), "b");
  const r = await scan(root, { limit: 1 });
  assert.equal(r.files.length, 1);
  assert(r.partial);
});
