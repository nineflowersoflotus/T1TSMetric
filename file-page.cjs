function filePage(files, filter = "all", offset = 0, limit = 120) {
  if (!["all", "temp", "duplicate", "large"].includes(filter)) throw Error("Invalid filter.");
  offset = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  limit = Number.isSafeInteger(limit) ? Math.max(1, Math.min(120, limit)) : 120;
  let count = 0;
  const rows = [];
  for (const f of files) {
    if (filter !== "all" && !(filter === "large" ? f.size >= 100 * 1024 ** 2 : f.kind === filter)) continue;
    if (count >= offset && rows.length < limit) rows.push({ id: f.id, path: f.path, name: f.name, size: f.size, kind: f.kind, group: f.group });
    count++;
  }
  return { rows, count, offset };
}
module.exports = { filePage };
