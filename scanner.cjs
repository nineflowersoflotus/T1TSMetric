const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const crypto = require("node:crypto");
function inside(root, file) {
  const r = path.relative(path.resolve(root), path.resolve(file));
  return r === "" || !r.startsWith(".." + path.sep) && r !== ".." && !path.isAbsolute(r);
}
function blocked(file, roots) {
  return roots.some((r) => r && inside(r, file));
}
async function hash(file) {
  const h = crypto.createHash("sha256");
  for await (const data of fs.createReadStream(file)) h.update(data);
  return h.digest("hex");
}
async function scan(root, { protectedRoots = [], tempRoot = "", duplicates = false, limit = 1e5, progress = () => {
} } = {}) {
  root = await fsp.realpath(root);
  if (blocked(root, protectedRoots)) throw Error("Pasta protegida. Escolha uma pasta pessoal.");
  const files = [], queue = [root];
  let skipped = 0, bytes = 0, partial = false, last = 0;
  while (queue.length) {
    const dir = queue.pop();
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      skipped++;
      continue;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink() || blocked(file, protectedRoots) || /^(\$recycle\.bin|system volume information|\.git|node_modules)$/i.test(entry.name)) {
        skipped++;
        continue;
      }
      if (entry.isDirectory()) {
        queue.push(file);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const s = await fsp.lstat(file);
        if (!s.isFile() || s.isSymbolicLink()) {
          skipped++;
          continue;
        }
        const age = Date.now() - s.mtimeMs;
        const temporary = age > 7 * 864e5 && (tempRoot && inside(tempRoot, file) || /\.(tmp|temp)$/i.test(file));
        files.push({ id: crypto.randomUUID(), path: file, name: entry.name, size: s.size, mtime: s.mtimeMs, ino: s.ino, dev: s.dev, kind: temporary ? "temp" : "review" });
        bytes += s.size;
      } catch {
        skipped++;
      }
      if (Date.now() - last > 200) {
        progress({ count: files.length, bytes, phase: "Lendo arquivos" });
        last = Date.now();
      }
      if (files.length >= limit) {
        partial = true;
        break;
      }
    }
    if (partial) break;
  }
  let duplicateGroups = 0, hashSkipped = 0;
  if (duplicates) {
    const sizes = /* @__PURE__ */ new Map();
    for (const file of files) {
      if (file.size && file.size <= 512 * 1024 * 1024) {
        if (!sizes.has(file.size)) sizes.set(file.size, []);
        sizes.get(file.size).push(file);
      } else if (file.size) hashSkipped++;
    }
    for (const group of sizes.values()) {
      if (group.length < 2) continue;
      const hashes = /* @__PURE__ */ new Map();
      for (const file of group) {
        if (Date.now() - last > 200) {
          progress({ count: files.length, bytes, phase: "Verificando duplicados por SHA-256" });
          last = Date.now();
        }
        try {
          const digest = await hash(file.path);
          if (!hashes.has(digest)) hashes.set(digest, []);
          hashes.get(digest).push(file);
        } catch {
          skipped++;
        }
      }
      for (const matches of hashes.values()) if (matches.length > 1) {
        duplicateGroups++;
        matches.sort((a, b) => a.path.localeCompare(b.path));
        matches.forEach((f, i) => {
          f.group = duplicateGroups;
          f.kind = i === 0 ? "original" : "duplicate";
        });
      }
    }
  }
  files.sort((a, b) => b.size - a.size);
  return { root, files, bytes, skipped, partial, duplicateGroups, hashSkipped };
}
async function validateFile(file, root, protectedRoots = []) {
  if (!inside(root, file.path) || blocked(file.path, protectedRoots)) throw Error("Caminho protegido ou fora da an\xE1lise.");
  const real = await fsp.realpath(file.path);
  if (path.resolve(real).toLowerCase() !== path.resolve(file.path).toLowerCase()) throw Error("O caminho foi redirecionado. Analise novamente.");
  const s = await fsp.lstat(file.path);
  if (!s.isFile() || s.isSymbolicLink() || s.size !== file.size || s.mtimeMs !== file.mtime || s.ino !== file.ino || s.dev !== file.dev) throw Error("Arquivo alterado desde a an\xE1lise. Analise novamente.");
}
module.exports = { scan, inside, blocked, validateFile };
