# Security notes

File operations run locally. The renderer has no Node.js access; the preload exposes a fixed IPC surface. External navigation is blocked. The credit URL and Recycle Bin target are constants rather than renderer-supplied commands.

Only files from the most recent completed scan can be sent to the Recycle Bin. Paths, file identity, size and modification time are rechecked before removal. A native confirmation is required. Changes to files between checks and OS operations cannot be eliminated entirely; never use cleanup suggestions as a substitute for reviewing files.

Imported VRM data is parsed locally, limited to 100 MB and subject to the page's restricted content policy. Keep Electron and rendering dependencies updated and retest before changing locked versions.
