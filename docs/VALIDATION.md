# Validation — 1.3.0

## Automated checks

Eleven unit tests passed. One junction-creation test was skipped because the restricted test environment cannot create junctions. Tests cover path containment, protected folders, duplicates, file identity, partial scans, bounded pagination, spring rebound at different frame rates, repeated click stability, both Recycle Bin launch paths and propagation of native launch failures.

The project was installed using its lockfile with `npm ci`, then built and packaged from the included scripts. The final Windows executable was launched in an offscreen integration harness.

## Actual mouse path and deformation

The harness dispatches browser mouse press/release events onto the visible character. It does not call an internal impulse helper. The pointer path, raycast and click handler must run to increase the click counter.

A vertex weighted to the bust bones is sampled relative to the chest, excluding whole-body movement. The checked build showed about 3 cm of secondary vertex displacement and a positive/negative rebound while body translation settled. This validates mesh deformation rather than only a spring-state number or a change in character position. Motion is bounded and recovers with damping.

English/Portuguese menus, custom colors, saved settings, framing arrows, paginated selection and the on-screen credit were also exercised. The optimized model retained 20 draw calls and 87 VRM spring joints.

## Recycle Bin

Unit tests verify ShellExecute, the canonical Explorer CLSID fallback and failure propagation. In the restricted integration environment, ShellExecute was unavailable and the Explorer fallback process was successfully dispatched. A separate normal desktop test launched the generated executable, clicked its actual Recycle Bin button and confirmed a new **Lixeira – Explorador de Arquivos** window. Only the two windows opened for this test were closed afterward. No Recycle Bin contents were removed.

## Practical limits

Graphical tests used offscreen rendering, `--no-sandbox` and `--disable-gpu` because of this environment. The distributed application adds none of these switches. FPS measurements in that test are not representative of a user's GPU. Actual focused performance and Windows working-set size depend on drivers, display size and active data.

No personal files were removed. No GitHub repository, workflow run or release was created remotely during this task. The included workflow configuration is ready for the repository owner to run after upload.
