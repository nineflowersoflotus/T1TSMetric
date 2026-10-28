// Build a portable Windows release using the installed, checksum-verified
// Electron runtime. Only this explicit allowlist enters the application bundle.

const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const psLiteral = (value) => "'" + value.replaceAll("'", "''") + "'";
(async () => {
  if (process.platform !== "win32") throw Error("Windows x64 is required to package this release.");
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw Error("Use a three-part release version.");
  if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== "v" + pkg.version) {
    throw Error("The tag must match package.json: v" + pkg.version);
  }
  execFileSync(process.execPath, [path.join(__dirname, "build.cjs")], { cwd: root, stdio: "inherit" });
  const tests = (await fs.readdir(path.join(root, "test"))).filter((name) => name.endsWith(".test.cjs")).map((name) => path.join(root, "test", name));
  execFileSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
  const baseName = `T1TSMetric-${pkg.version}-Windows-x64`;
  const dist = path.join(root, "dist");
  await fs.mkdir(dist, { recursive: true });
  const output = path.join(dist, baseName);
  await fs.mkdir(output);
  const runtime = process.env.ELECTRON_OVERRIDE_DIST_PATH || path.dirname(require("electron"));
  await fs.cp(runtime, output, { recursive: true, filter: (file) => {
    const relative = path.relative(runtime, file).replaceAll("\\", "/");
    if (relative.startsWith("locales/")) return ["locales/en-US.pak", "locales/pt-BR.pak"].includes(relative);
    return relative !== "resources/default_app.asar";
  } });
  const exePath = path.join(output, "T1TSMetric.exe");
  await fs.rename(path.join(output, "electron.exe"), exePath);
  const { resedit } = await import(pathToFileURL(path.join(root, "node_modules/@electron/packager/dist/resedit.js")));
  await resedit(exePath, {
    fileVersion: pkg.version,
    productVersion: pkg.version,
    productName: "T1TSMetric",
    win32Metadata: { FileDescription: "T1TSMetric", InternalName: "T1TSMetric", OriginalFilename: "T1TSMetric.exe", CompanyName: "nineflowersoflotus" }
  });
  const appDir = path.join(output, "resources/app");
  await fs.mkdir(appDir, { recursive: true });
  for (const name of ["main.cjs", "preload.cjs", "scanner.cjs", "scan-worker.cjs", "file-page.cjs", "windows-shell.cjs", "qa.cjs", "ui", "assets"]) {
    await fs.cp(path.join(root, name), path.join(appDir, name), { recursive: true });
  }
  await fs.writeFile(path.join(appDir, "package.json"), JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, main: pkg.main }, null, 2));
  for (const name of ["README.md", "LICENSE", "THIRD-PARTY", "RELEASE_NOTES.md", "CHANGELOG.md", "docs"]) {
    await fs.cp(path.join(root, name), path.join(output, name), { recursive: true });
  }
  if (process.env.T1TS_SKIP_ZIP === "1") {
    console.log(output);
    return;
  }
  const archive = path.join(dist, baseName + ".zip");
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Compress-Archive -LiteralPath ${psLiteral(output)} -DestinationPath ${psLiteral(archive)} -CompressionLevel Optimal`], { stdio: "inherit", windowsHide: true });
  const checksum = crypto.createHash("sha256");
  for await (const chunk of createReadStream(archive)) checksum.update(chunk);
  const sha256 = checksum.digest("hex");
  await fs.writeFile(path.join(dist, "SHA256SUMS.txt"), `${sha256}  ${path.basename(archive)}
`);
  console.log(archive);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
