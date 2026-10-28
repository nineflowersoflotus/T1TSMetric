# Testing

Run `npm test` for pure Node.js unit tests. Tests create disposable temporary files only; they do not delete personal data or empty the Recycle Bin.

`qa.cjs` is an opt-in integration harness for an installed/development build. Prepare a disposable folder containing at least 260 small files, then set `DISK_TEST_ROOT` to it, `T1TS_QA_DIR` to a separate writable output folder, and `DISK_SMOKE=1` before launching Electron. Create both directories first. The harness captures screenshots and a report, exercises actual browser pointer events, and exits the app. It also attempts to open the Windows Recycle Bin, without emptying it. Clear these variables after testing.

Do not commit QA captures, reports or local user settings. Use a temporary directory or the gitignored `.qa-output/` folder. The runtime exposes read-only mesh sampling only when the main process adds the test argument to its sandboxed preload.

For a visual review, check the window at 1200×820 and its minimum 940×600 size; test the two languages, every palette, custom colors, keyboard arrows, dragging, click response, physics off/on, page selection and Recycle Bin activation. Use a noncritical disposable file if manually testing cleanup.

Release automation is described in README.md. Checksums cover the final ZIP and use streaming hashing to avoid loading the entire release archive into memory.
