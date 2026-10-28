const fs = require("node:fs/promises"), path = require("node:path");
const { Menu } = require("electron");
exports.run = ({ win, app, out }) => {
  win.webContents.on("console-message", (_e, ...args) => console.log("UI", ...args));
  win.webContents.on("did-finish-load", () => setTimeout(async () => {
    const js = (code) => win.webContents.executeJavaScript(code);
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const capture = async (name) => {
      await pause(1200);
      await fs.writeFile(path.join(out, name), (await win.webContents.capturePage(void 0, { stayHidden: true, stayAwake: true })).toPNG());
    };
    const report = {};
    try {
      await js(`document.getElementById('folder').value=${JSON.stringify(process.env.DISK_TEST_ROOT)};document.getElementById('duplicates').checked=true;document.getElementById('scan').click();`);
      for (let i = 0; i < 45; i++) {
        if (await js("window.__diagnostics.modelLoaded && !!window.__diagnostics.lastScan")) break;
        await pause(1e3);
      }
      report.initial = await js("JSON.parse(JSON.stringify(window.__diagnostics))");
      report.nativeMenu = Menu.getApplicationMenu().items.map((i) => i.label);
      report.memory = app.getAppMetrics().map((m) => ({ type: m.type, memory: m.memory }));
      await capture("preview.png");
      await js("document.querySelector('#files input').click();document.getElementById('next').click();");
      await pause(600);
      report.page2 = await js("({range:document.getElementById('pageInfo').textContent,rows:document.querySelectorAll('.file').length,selected:document.getElementById('selected').textContent})");
      await js("document.getElementById('previous').click();");
      await pause(600);
      report.selectionRetained = await js("document.querySelector('#files input').checked");
      await js("document.querySelector('#files input').click();document.getElementById('options').click();");
      await capture("options.png");
      await js("document.getElementById('language').value='pt';document.getElementById('language').dispatchEvent(new Event('change'));");
      await pause(600);
      report.portuguese = { label: await js("document.querySelector('#scan span').textContent"), menu: Menu.getApplicationMenu().items[0].label };
      await js("document.getElementById('preset').value='dark';document.getElementById('preset').dispatchEvent(new Event('change'));document.getElementById('settings').close();");
      await capture("dark.png");
      await js("document.getElementById('colorBg').value='#e8f0e7';document.getElementById('colorBg').dispatchEvent(new Event('input'));");
      report.custom = await js("({color:getComputedStyle(document.documentElement).getPropertyValue('--bg'),saved:JSON.parse(localStorage.getItem('t1tsmetric.options')).colors.bg})");
      await js("document.getElementById('preset').value='rose';document.getElementById('preset').dispatchEvent(new Event('change'));document.getElementById('language').value='en';document.getElementById('language').dispatchEvent(new Event('change'));");
      const baseline = await js("window.__diagnostics.cameraTarget");
      await js("document.getElementById('up').click();");
      await pause(1200);
      report.camera = { before: baseline, after: await js("window.__diagnostics.cameraTarget") };
      await js("document.getElementById('down').click();");
      report.beforeClick = await js("window.__motionSnapshot");
      const rect = await js("(()=>{const r=document.getElementById('avatar').getBoundingClientRect();return {x:r.x+r.width*.50,y:r.y+r.height*.62};})()");
      win.webContents.debugger.attach("1.3");
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mouseMoved", ...rect });
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mousePressed", ...rect, button: "left", clickCount: 1 });
      await pause(50);
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mouseReleased", ...rect, button: "left", clickCount: 1 });
      win.webContents.debugger.detach();
      report.clickSamples = [];
      for (let i = 0; i < 20; i++) {
        await pause(75);
        report.clickSamples.push(await js("window.__motionSnapshot"));
      }
      report.afterImpulse = await js("JSON.parse(JSON.stringify(window.__diagnostics))");
      try {
        report.recycle = await js("window.diskApp.recycle()");
      } catch (e) {
        report.recycleFailure = e.message;
      }
      report.credit = await js("document.getElementById('credit').textContent");
      await js("document.getElementById('demo').checked=true;document.getElementById('simulated').value=0;");
      await pause(4e3);
      report.low = await js("window.__diagnostics.volumeScale");
      await js("document.getElementById('simulated').value=100;");
      await pause(4e3);
      report.high = await js("window.__diagnostics.volumeScale");
      await capture("max-volume.png");
      await js("document.getElementById('demo').checked=false;");
      await pause(3e3);
      await capture("preview.png");
      win.setSize(940, 600);
      await capture("small.png");
      report.final = await js("JSON.parse(JSON.stringify(window.__diagnostics))");
      const assert = require("node:assert/strict");
      assert.equal(report.final.errors.length, 0);
      assert.equal(report.afterImpulse.clickCount, 1, "real pointer click must reach the raycast handler");
      assert(report.beforeClick.vertex && report.clickSamples.every(sample => sample.vertex), "sample a weighted rendered vertex");
      const heights = report.clickSamples.map(sample => sample.vertex[1]);
      assert(Math.max(...heights) - Math.min(...heights) > 0.015, "mesh must deform relative to the chest");
      assert(report.clickSamples.some(sample => sample.bust > 0.1) && report.clickSamples.some(sample => sample.bust < -0.03), "secondary spring must rebound");
      assert.equal(report.credit, "github.com/nineflowersoflotus");
      report.passed = true;
    } catch (e) {
      report.failure = e.stack;
      console.error(e);
    }
    await fs.writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    app.exit(report.failure ? 1 : 0);
  }, 2500));
};
