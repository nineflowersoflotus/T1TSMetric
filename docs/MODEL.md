# Model provenance

- Model: Victoria Rubin, by VRoid Project / pixiv.
- License: CC0, preserved in the VRM metadata.
- [Official conditions](https://vroid.pixiv.help/hc/en-us/articles/360014900233).
- [Original-file mirror](https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Victoria_Rubin.vrm).
- Original SHA-256: `b1372131bdbf233f46320146d565f342a7e4f6f4b8f2aefb301f1a283ec07e1e`.

The bundled VRM has resized embedded textures. Face, iris and the principal outfit retain 1024-pixel textures; other images are capped at 512. Skeletons, original weights and model licensing metadata are retained. `model-optimization.json` documents the byte counts. The source application combines compatible hair meshes at runtime and skips redundant outline passes.

Only the optimized VRM is needed to build and run the application. Imported avatars are temporary and are not bundled into generated releases. Use adult characters and comply with each imported model's license.
