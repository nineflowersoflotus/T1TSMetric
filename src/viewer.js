import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { preferences, savePreferences } from "./options.js";
import { t, errorText } from "./i18n.js";
import { createMotion, kickMotion, advanceMotion } from "./motion.mjs";
export function initViewer({ usage, status }) {
  const $ = (id) => document.getElementById(id), canvas = $("avatar"), scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "default", stencil: false });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.6;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.65;
  scene.add(new THREE.HemisphereLight(16774894, 10723760, 1.05));
  const key = new THREE.DirectionalLight(16774117, 1.15);
  key.position.set(-1.5, 2, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(14214399, 0.4);
  rim.position.set(2, 2, -2);
  scene.add(rim);
  const loader = new GLTFLoader();
  loader.register((parser) => {
    const plugin = new VRMLoaderPlugin(parser);
    plugin.metaPlugin.needThumbnailImage = false;
    return plugin;
  });
  let vrm = null, bust = [], baseY = 0, visualUsage = 0, modelLoading = false, modelHeight = 1.6, head, chest;
  let pointerX = 0, pointerY = 0, defaultModel = true, sampleMesh = null, sampleIndex = -1;
  const motion = createMotion();
  function resetCamera() {
    const span = modelHeight * 0.4, distance = span * 0.5 / Math.tan(Math.PI / 12) * 1.05;
    const center = modelHeight * (0.825 - preferences.viewOffset);
    controls.target.set(0, center, 0);
    camera.position.set(0, center, distance);
    controls.update();
  }
  function move(amount) {
    const old = preferences.viewOffset;
    preferences.viewOffset = THREE.MathUtils.clamp(old + amount, -0.25, 0.25);
    const change = -(preferences.viewOffset - old) * modelHeight;
    controls.target.y += change;
    camera.position.y += change;
    savePreferences();
  }
  $("up").onclick = () => move(0.025);
  $("down").onclick = () => move(-0.025);
  $("resetView").onclick = $("resetCamera").onclick = () => {
    preferences.viewOffset = 0;
    savePreferences();
    resetCamera();
  };
  addEventListener("resetview", resetCamera);
  addEventListener("keydown", (e) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key) || document.querySelector("dialog[open]") || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable) return;
    e.preventDefault();
    move(e.key === "ArrowUp" ? 0.025 : -0.025);
  });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25, Math.sqrt(85e4 / (w * h))));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (vrm) {
      resetCamera();
      renderer.render(scene, camera);
    }
  }
  new ResizeObserver(resize).observe(canvas);
  function modelStatus() {
    $("modelstatus").textContent = vrm ? (defaultModel ? "Victoria Rubin" : t("imported")) + (bust.length ? "" : " \xB7 " + t("noBones")) : t("loading");
  }
  function tunePhysics() {
    if (!vrm) return;
    for (const joint of vrm.springBoneManager?.joints || []) {
      if (/bust|breast/i.test(joint.bone.name)) {
        joint.settings.stiffness = 0.42 / preferences.motion;
        joint.settings.dragForce = 0.09;
        joint.settings.gravityPower = 0;
      }
    }
    if (!preferences.physics) {
      motion.bust.x = motion.bust.v = motion.sway.x = motion.sway.v = 0;
      vrm.springBoneManager?.reset();
    }
    modelStatus();
  }
  let lastPhysicsSettings = "";
  addEventListener("preferenceschange", () => {
    const key2 = [preferences.motion, preferences.physics, preferences.language].join(":");
    if (key2 !== lastPhysicsSettings) {
      lastPhysicsSettings = key2;
      tunePhysics();
    }
  });
  function reduceTextures(root) {
    const textures = /* @__PURE__ */ new Set(), resized = /* @__PURE__ */ new WeakMap();
    let count = 0;
    root.traverse((o) => {
      if (!o.material) return;
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) for (const property of ["map", "normalMap", "emissiveMap", "shadeMultiplyTexture", "matcapTexture", "rimMultiplyTexture", "outlineWidthMultiplyTexture", "uvAnimationMaskTexture"]) {
        const texture = material[property];
        if (!texture?.isTexture || textures.has(texture)) continue;
        textures.add(texture);
        const image = texture.image, w = image?.width, h = image?.height;
        if (!w || !h || Math.max(w, h) <= 1024) continue;
        let reduced = resized.get(image);
        if (!reduced) {
          reduced = document.createElement("canvas");
          const ratio = 1024 / Math.max(w, h);
          reduced.width = Math.max(1, Math.round(w * ratio));
          reduced.height = Math.max(1, Math.round(h * ratio));
          reduced.getContext("2d").drawImage(image, 0, 0, reduced.width, reduced.height);
          resized.set(image, reduced);
        }
        texture.image = reduced;
        texture.needsUpdate = true;
        count++;
      }
    });
    return count;
  }
  function disposeModel(model) {
    const images = /* @__PURE__ */ new Set();
    model.scene.traverse((o) => {
      for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) for (const v of Object.values(m)) if (v?.isTexture && v.image) images.add(v.image);
    });
    scene.remove(model.scene);
    VRMUtils.deepDispose(model.scene);
    renderer.renderLists.dispose();
    for (const image of images) image.close?.();
  }
  function combineHair(model) {
    const groups = /* @__PURE__ */ new Map(), replaced = /* @__PURE__ */ new Map();
    let saved = 0;
    model.scene.traverse((o) => {
      if (!o.isSkinnedMesh || Array.isArray(o.material) || !/hair/i.test(o.material.name) || Object.keys(o.geometry.morphAttributes).length) return;
      o.updateMatrix();
      const key2 = [o.parent.uuid, o.material.uuid, o.skeleton.uuid, Array.from(o.bindMatrix.elements).join(","), Array.from(o.matrix.elements).join(","), Object.keys(o.geometry.attributes).sort().join(","), !!o.geometry.index].join("|");
      if (!groups.has(key2)) groups.set(key2, []);
      groups.get(key2).push(o);
    });
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue;
      const mergedGeometry = mergeGeometries(meshes.map((m) => m.geometry));
      if (!mergedGeometry) continue;
      const first = meshes[0], merged = new THREE.SkinnedMesh(mergedGeometry, first.material);
      merged.name = first.name + "_combined";
      merged.position.copy(first.position);
      merged.quaternion.copy(first.quaternion);
      merged.scale.copy(first.scale);
      merged.bindMode = first.bindMode;
      merged.bind(first.skeleton, first.bindMatrix);
      merged.renderOrder = first.renderOrder;
      merged.frustumCulled = false;
      first.parent.add(merged);
      for (const mesh of meshes) {
        replaced.set(mesh, merged);
        mesh.parent.remove(mesh);
        mesh.geometry.dispose();
      }
      saved += meshes.length - 1;
    }
    if (model.firstPerson) {
      const seen = /* @__PURE__ */ new Set();
      model.firstPerson.meshAnnotations = model.firstPerson.meshAnnotations.map((a) => ({ ...a, meshes: a.meshes?.map((m) => replaced.get(m) || m) })).filter((a) => {
        const key2 = a.meshes?.map((m) => m.uuid).join(",");
        if (!key2 || !seen.has(key2)) {
          seen.add(key2);
          return true;
        }
        return false;
      });
    }
    return saved;
  }
  async function loadModel(buffer, isDefault = false) {
    if (modelLoading) return;
    modelLoading = true;
    $("modelstatus").textContent = t("loading");
    try {
      const gltf = await loader.parseAsync(buffer, ""), next = gltf.userData.vrm;
      if (!next) throw Error(t("invalidVRM"));
      VRMUtils.rotateVRM0(next);
      VRMUtils.removeUnnecessaryVertices(next.scene);
      VRMUtils.combineSkeletons(next.scene);
      const resizedTextures = reduceTextures(next.scene), mergedHairMeshes = combineHair(next);
      next.scene.traverse((o) => {
        o.frustumCulled = false;
        for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {
          if (m.isMToonMaterial) {
            if (m.isOutline) {
              m.visible = false;
              continue;
            }
            m.outlineWidthMode = "none";
            m.shadingToonyFactor = 0.65;
            m.shadingShiftFactor = -0.06;
            if (m.shadeColorFactor?.lerp) m.shadeColorFactor.lerp(m.color, 0.2);
            m.needsUpdate = true;
          }
        }
      });
      if (vrm) disposeModel(vrm);
      vrm = next;
      defaultModel = isDefault;
      scene.add(vrm.scene);
      bust = [];
      vrm.scene.traverse((o) => {
        if (/(?:bust|breast)[_ .-]?1$/i.test(o.name)) bust.push({ bone: o, scale: o.scale.clone(), position: o.position.clone(), rotation: o.quaternion.clone() });
      });
      const left = vrm.humanoid.getNormalizedBoneNode("leftUpperArm"), right = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      if (left) left.rotation.z = 1.15;
      if (right) right.rotation.z = -1.15;
      head = vrm.humanoid.getNormalizedBoneNode("head");
      chest = vrm.humanoid.getNormalizedBoneNode("upperChest") || vrm.humanoid.getNormalizedBoneNode("chest");
      vrm.update(0);
      const bounds = new THREE.Box3().setFromObject(vrm.scene);
      vrm.scene.position.y -= bounds.min.y;
      baseY = vrm.scene.position.y;
      modelHeight = bounds.max.y - bounds.min.y;
      resetCamera();
      tunePhysics();
      if (window.diskApp.qa) {
        let maxWeight = 0;
        sampleMesh = null;
        sampleIndex = -1;
        vrm.scene.traverse((o) => {
          if (!o.isSkinnedMesh) return;
          const ids = o.geometry.attributes.skinIndex, weights = o.geometry.attributes.skinWeight;
          if (!ids || !weights) return;
          for (let i = 0; i < ids.count; i++) {
            let weight = 0;
            for (let j = 0; j < 4; j++) if (/Bust|Breast/i.test(o.skeleton.bones[ids.getComponent(i, j)]?.name || "")) weight += weights.getComponent(i, j);
            if (weight > maxWeight) {
              maxWeight = weight;
              sampleMesh = o;
              sampleIndex = i;
            }
          }
        });
      }
      Object.assign(window.__diagnostics, { modelLoaded: true, bustBones: bust.map((b) => b.bone.name), springJoints: vrm.springBoneManager?.joints.size || 0, resizedTextures, mergedHairMeshes });
    } catch (e) {
      $("modelstatus").textContent = errorText(e);
      status(errorText(e));
      window.__diagnostics.errors.push(e.message);
    } finally {
      modelLoading = false;
    }
  }
  $("import").onclick = async () => {
    try {
      const data = await window.diskApp.model();
      if (data) await loadModel(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    } catch (e) {
      status(errorText(e));
    }
  };
  addEventListener("pointermove", (e) => {
    pointerX = (e.clientX / innerWidth - 0.5) * 2;
    pointerY = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  let downX = 0, downY = 0, dragDistance = 0;
  canvas.addEventListener("pointerdown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
    dragDistance = 0;
  }, true);
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons) dragDistance = Math.max(dragDistance, Math.hypot(e.clientX - downX, e.clientY - downY));
  }, { passive: true });
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  canvas.addEventListener("click", (e) => {
    if (!vrm || dragDistance > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(vrm.scene, true).length) {
      kickMotion(motion, preferences.motion);
      window.__diagnostics.clickCount = motion.clicks;
    }
  });
  let previousFrame = performance.now(), elapsed = 0, frames = 0, lastDiagnostic = 0, raf = 0, running = false, suspended = false, nextRender = 0, framesWindow = 0, windowStart = performance.now(), measuredFPS = 0;
  function stopLoop() {
    cancelAnimationFrame(raf);
    running = false;
  }
  function startLoop() {
    if (running || document.hidden || suspended) return;
    running = true;
    previousFrame = performance.now();
    nextRender = 0;
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (document.hidden || suspended) {
      stopLoop();
      return;
    }
    raf = requestAnimationFrame(frame);
    const fps = document.hasFocus() ? preferences.fps : Math.min(15, preferences.fps), period = 1e3 / fps;
    if (now + 1 < nextRender) return;
    nextRender = nextRender ? nextRender + period : now + period;
    if (now - nextRender > period) nextRender = now + period;
    const realDt = Math.max((now - previousFrame) / 1e3, 1e-3), dt = Math.min(realDt, 0.1);
    previousFrame = now;
    elapsed += dt;
    visualUsage = THREE.MathUtils.damp(visualUsage, $("demo").checked ? Number($("simulated").value) / 100 : usage(), 3, realDt);
    if (vrm) {
      advanceMotion(motion, realDt, preferences.motion, preferences.physics);
      vrm.scene.position.y = baseY + Math.sin(elapsed * 2.4) * 7e-3 * preferences.motion + motion.body.x;
      vrm.scene.rotation.z = Math.sin(elapsed * 1.3) * 0.012 * preferences.motion + motion.sway.x * 0.12;
      vrm.scene.rotation.x = motion.body.x * 1.4;
      if (chest) {
        chest.rotation.x = Math.sin(elapsed * 2.1) * 0.012 * preferences.motion;
        chest.rotation.z = Math.sin(elapsed * 1.3) * 8e-3 * preferences.motion;
      }
      if (head) {
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, pointerX * 0.22, 4, realDt);
        head.rotation.x = THREE.MathUtils.damp(head.rotation.x, pointerY * 0.1, 4, realDt);
      }
      const scale = 0.7 + visualUsage * preferences.intensity;
      for (const b of bust) {
        b.bone.scale.copy(b.scale).multiplyScalar(scale);
        b.bone.position.copy(b.position);
        b.bone.quaternion.copy(b.rotation);
        if (preferences.physics) b.bone.position.y += motion.bust.x * 0.025;
      }
      vrm.expressionManager?.setValue("blink", Math.max(0, 1 - Math.abs(elapsed % 4.7 - 0.12) / 0.1));
      vrm.update(preferences.physics ? Math.min(dt, 0.05) : 0);
      if (preferences.physics) for (const b of bust) {
        b.bone.rotateX(motion.bust.x);
        b.bone.rotateZ(motion.sway.x);
        b.bone.updateMatrix();
      }
      vrm.scene.updateMatrixWorld(true);
      frames++;
      if (now - lastDiagnostic > 500) {
        Object.assign(window.__diagnostics, { volumeScale: scale, bustQuaternion: bust[0]?.bone.quaternion.toArray(), renderedFrames: frames, renderCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, frameLimit: preferences.fps, defaultIntensity: preferences.intensity, language: preferences.language, viewOffset: preferences.viewOffset, cameraTarget: controls.target.y, headToWaist: true, springAngle: motion.bust.x, measuredFPS, geometryCount: renderer.info.memory.geometries, textureCount: renderer.info.memory.textures });
        lastDiagnostic = now;
      }
    }
    controls.update();
    renderer.render(scene, camera);
    framesWindow++;
    if (now - windowStart > 2e3) {
      measuredFPS = framesWindow * 1e3 / (now - windowStart);
      windowStart = now;
      framesWindow = 0;
    }
  }
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopLoop() : startLoop();
  });
  window.diskApp.visibility((active) => {
    suspended = !active;
    active ? startLoop() : stopLoop();
  });
  if (window.diskApp.qa) Object.defineProperty(window, "__motionSnapshot", { get: () => {
    let vertex = null;
    if (sampleMesh && chest) {
      vrm.scene.updateMatrixWorld(true);
      sampleMesh.skeleton.update();
      const v = new THREE.Vector3();
      sampleMesh.getVertexPosition(sampleIndex, v);
      sampleMesh.localToWorld(v);
      chest.worldToLocal(v);
      vertex = v.toArray();
    }
    return { bodyY: motion.body.x, bust: motion.bust.x, sway: motion.sway.x, clicks: motion.clicks, vertex };
  } });
  startLoop();
  fetch("../assets/Victoria_Rubin_Lite.vrm").then((r) => {
    if (!r.ok) throw Error(t("modelMissing"));
    return r.arrayBuffer();
  }).then((b) => loadModel(b, true)).catch((e) => {
    status(errorText(e));
    window.__diagnostics.errors.push(e.message);
  });
  return { suspended: () => suspended };
}
