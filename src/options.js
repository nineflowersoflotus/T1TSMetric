import { setLanguage, locale } from "./i18n.js";
const $ = (id) => document.getElementById(id);
export const palettes = { rose: { bg: "#f7e3e7", surface: "#fffaf9", text: "#231a1a", accent: "#a6002a", links: "#0000ee" }, classic: { bg: "#d4d0c8", surface: "#ffffff", text: "#111111", accent: "#365c7d", links: "#0000cc" }, dark: { bg: "#24262c", surface: "#30333a", text: "#f0ece6", accent: "#e69ab2", links: "#aabfff" } };
const defaults = { schema: 2, intensity: 2, physics: true, fps: 60, motion: 1.5, language: "en", preset: "rose", colors: { ...palettes.rose }, viewOffset: 0 };
export const preferences = { ...defaults, colors: { ...defaults.colors } };
try {
  const p = JSON.parse(localStorage.getItem("t1tsmetric.options") || "{}");
  for (const [key, low, high] of [["intensity", 0.25, 2], ["motion", 0.25, 2.5], ["viewOffset", -0.25, 0.25]]) if (Number.isFinite(p[key]) && p[key] >= low && p[key] <= high) preferences[key] = p[key];
  if (typeof p.physics === "boolean") preferences.physics = p.physics;
  if (p.schema === 2 && [15, 30, 60].includes(p.fps)) preferences.fps = p.fps;
  if (["en", "pt"].includes(p.language)) preferences.language = p.language;
  if (["rose", "classic", "dark", "custom"].includes(p.preset)) preferences.preset = p.preset;
  for (const key of Object.keys(palettes.rose)) if (/^#[a-f\d]{6}$/i.test(p.colors?.[key])) preferences.colors[key] = p.colors[key];
} catch {
}
export function savePreferences() {
  try {
    localStorage.setItem("t1tsmetric.options", JSON.stringify(preferences));
  } catch {
  }
}
const colorInputs = { colorBg: "bg", colorSurface: "surface", colorText: "text", colorAccent: "accent", colorLinks: "links" };
let lastLanguage = null;
export function applyPreferences() {
  const languageChanged = lastLanguage !== preferences.language;
  if (languageChanged) setLanguage(preferences.language);
  for (const [key, name] of Object.entries({ bg: "bg", surface: "surface", text: "ink", accent: "accent", links: "link" })) document.documentElement.style.setProperty("--" + name, preferences.colors[key]);
  const rgb = preferences.colors.bg.slice(1);
  document.documentElement.style.colorScheme = parseInt(rgb.slice(0, 2), 16) + parseInt(rgb.slice(2, 4), 16) + parseInt(rgb.slice(4, 6), 16) < 360 ? "dark" : "light";
  $("intensity").value = preferences.intensity;
  $("intensityLabel").textContent = preferences.intensity.toLocaleString(locale()) + "\xD7";
  $("motion").value = preferences.motion;
  $("motionLabel").textContent = preferences.motion.toLocaleString(locale()) + "\xD7";
  $("physics").checked = preferences.physics;
  $("fps").value = preferences.fps;
  $("language").value = preferences.language;
  $("preset").value = preferences.preset;
  for (const [id, key] of Object.entries(colorInputs)) $(id).value = preferences.colors[key];
  if (languageChanged) {
    lastLanguage = preferences.language;
    window.diskApp.language(preferences.language).catch(() => {
    });
  }
  window.dispatchEvent(new CustomEvent("preferenceschange", { detail: { languageChanged } }));
}
export function initOptions() {
  $("options").onclick = () => $("settings").showModal();
  $("about").onclick = () => $("aboutDialog").showModal();
  for (const key of ["intensity", "motion"]) $(key).oninput = () => {
    preferences[key] = Number($(key).value);
    savePreferences();
    applyPreferences();
  };
  for (const key of ["fps", "physics", "language"]) $(key).onchange = () => {
    preferences[key] = key === "fps" ? Number($(key).value) : key === "physics" ? $(key).checked : $(key).value;
    savePreferences();
    applyPreferences();
  };
  $("preset").onchange = () => {
    preferences.preset = $("preset").value;
    if (palettes[preferences.preset]) preferences.colors = { ...palettes[preferences.preset] };
    savePreferences();
    applyPreferences();
  };
  for (const [id, key] of Object.entries(colorInputs)) $(id).oninput = () => {
    preferences.colors[key] = $(id).value;
    preferences.preset = "custom";
    savePreferences();
    applyPreferences();
  };
  $("demo").onchange = () => {
    $("demoControls").hidden = !$("demo").checked;
  };
  $("simulated").oninput = () => {
    $("simPercent").textContent = $("simulated").value + "%";
  };
  $("defaults").onclick = () => {
    Object.assign(preferences, defaults, { colors: { ...palettes.rose } });
    savePreferences();
    applyPreferences();
    $("demo").checked = false;
    $("demoControls").hidden = true;
    window.dispatchEvent(new Event("resetview"));
  };
  applyPreferences();
}
