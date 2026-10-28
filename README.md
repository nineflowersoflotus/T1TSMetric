# T1TSMetric

A Windows storage analyzer with a VRoid avatar. The avatar's volume follows the selected drive's usage. Local processing, English/Portuguese UI, classic controls, editable colors.

By [nineflowersoflotus](https://github.com/nineflowersoflotus). Named in tribute to mathematician Jacques Tits.

## Run the portable release

Download the Windows x64 ZIP from your repository's Releases page, extract the entire folder and open **T1TSMetric.exe**. No Node.js installation is needed for the portable build. Keep the adjacent files with the executable. The build is unsigned.

## Controls

- Select a drive, choose a folder and click **Analyze**.
- Duplicate comparison uses content hashes; results are paginated, 120 files at a time. Selection persists across pages.
- Nothing is deleted automatically. **Move to Recycle Bin** requires confirmation and rechecks file identity. Empty the Recycle Bin through Windows to actually free space.
- Click the character to apply an impulse. The body moves and secondary springs continue oscillating with a slower decay. Drag to rotate, scroll to zoom, use **↑ / ↓** to change framing and **↺** to reset.
- **Options** contains language, colors, volume, spring strength, physics and FPS. English, 2× volume and a 60 FPS target are defaults. Actual FPS depends on hardware.
- Unfocused rendering is capped at 15 FPS. Minimized rendering and periodic disk checks pause. A file scan already in progress continues until finished or canceled.

Temporary and duplicate labels are review suggestions, not a guarantee that files can be removed. Protected folders, inaccessible files and symbolic links are skipped. Scans stop at 100,000 files and report partial results. Hash comparison excludes files above 512 MB. File sizes are logical, so their sum may differ from physically occupied disk space.

## Develop

Requirements: Windows x64, Node.js 24 LTS and npm. From the repository root:

```powershell
npm ci
npm test
npm run build
npm start
```

`npm ci` installs the locked dependencies and downloads the pinned Electron runtime. Python, Unity and VRoid Studio are not required. The optimized VRM is already included.

## Build a release

```powershell
npm run release
```

This builds the UI, runs tests, copies an explicit application-file allowlist, sets Windows version metadata and creates a portable ZIP plus `dist/SHA256SUMS.txt`. An existing output folder is rejected to prevent mixing versions; remove that specific old folder before rebuilding the same version.

To prepare another release, update both package version fields (`package.json` and the root version in `package-lock.json`), then update `CHANGELOG.md` and `RELEASE_NOTES.md`. Commit and push a matching tag:

```powershell
git tag v1.3.0
git push origin v1.3.0
```

The included GitHub workflow builds and uploads a **draft** release for review. It does not publish the draft automatically. CI runs on Windows for pushes to `main` and pull requests. Workflow execution on GitHub has to be enabled in the repository; these files have not been run on GitHub yet.

## Layout

```text
src/                  UI logic, translations, preferences, 3D viewer, motion
ui/                   Classic HTML/CSS; app.js is generated and gitignored
assets/               Optimized CC0 VRoid model
main.cjs              Electron lifecycle and IPC
preload.cjs           Restricted renderer bridge
scanner.cjs           File analysis and cleanup validation
scan-worker.cjs       Background scan entry point
file-page.cjs         Bounded file-list responses
windows-shell.cjs     Recycle Bin and fixed credit link
test/                 Unit tests
qa.cjs                Opt-in local graphical integration harness
scripts/              Reproducible build/release commands
docs/                 Model provenance, testing and Portuguese guide
THIRD-PARTY/          Dependency/model license notices
.github/workflows/    CI and draft release automation
```

Generated binaries, `node_modules`, scan results, local settings and QA captures do not belong in Git. Upload portable ZIPs as release assets rather than committing Electron binaries.

## Model and licenses

Application code: [MIT](LICENSE), credited to nineflowersoflotus. Model: Victoria Rubin / VRoid Project / pixiv, **CC0**. The optimized model retains its licensing metadata. See [model provenance](docs/MODEL.md) and `THIRD-PARTY/` for asset and library notices.

[Português](docs/README.pt-BR.md) · [Changelog](CHANGELOG.md) · [Validation](docs/VALIDATION.md)
