const path = require("node:path");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/app.js"],
  outfile: "ui/app.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
  logLevel: "info"
}).catch(() => {
  process.exitCode = 1;
});
