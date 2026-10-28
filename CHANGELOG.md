# Changelog

## 1.3.0

- Visible credit link to github.com/nineflowersoflotus.
- Recycle Bin opens through Windows ShellExecute, with a canonical Explorer namespace fallback. Errors reach the UI instead of being discarded.
- Real pointer clicks apply a bounded damped impulse to body motion and secondary springs. Spring recovery continues after body translation settles.
- Physics response tested at 15, 30, 60 and 120 FPS and under repeated clicks.
- One VRM update per rendered frame; secondary motion integrates separately with small fixed substeps.
- Changes to colors, volume and FPS avoid rebuilding the file table. Native menu rebuilding remains limited to language changes.
- Clean repository layout, pinned dependencies, license notices, build scripts, Windows CI and draft release workflow.

## 1.2.0

- Head-to-waist framing, vertical arrows, editable colors and English/Portuguese UI.
- Optimized VRM textures, combined hair geometry and paginated file metadata.

## 1.1.0

- Classic interface, transparent avatar layer and separate options dialog.

## 1.0.0

- Initial local storage analyzer, duplicate comparison and VRoid viewer.
