const { test } = require("node:test"), assert = require("node:assert/strict"), { EventEmitter } = require("node:events");
const { openRecycleBin, RECYCLE_URI, RECYCLE_CLSID } = require("../windows-shell.cjs");
test("Recycle Bin uses ShellExecute and resolves without waiting for Explorer exit", async () => {
  let target;
  const r = await openRecycleBin({ openExternal: async (uri) => {
    target = uri;
  } });
  assert.equal(target, RECYCLE_URI);
  assert.equal(r.method, "shell-execute");
});
test("Recycle Bin falls back to the canonical Explorer namespace", async () => {
  let command, args;
  const launch = (exe, a) => {
    command = exe;
    args = a;
    const child = new EventEmitter();
    child.unref = () => {
    };
    queueMicrotask(() => child.emit("spawn"));
    return child;
  };
  const r = await openRecycleBin({ openExternal: async () => {
    throw Error("no handler");
  } }, launch, "C:\\Windows");
  assert(command.endsWith("explorer.exe"));
  assert.deepEqual(args, [RECYCLE_CLSID]);
  assert.equal(r.method, "explorer-clsid");
});
test("Recycle Bin failures reach the caller instead of being swallowed", async () => {
  const launch = () => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("error", Error("blocked")));
    return child;
  };
  await assert.rejects(openRecycleBin({ openExternal: async () => {
    throw Error("missing");
  } }, launch), /blocked/);
});
