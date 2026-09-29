// G1-PKG CDP harness — raw DevTools protocol over WebSocket, ACTIVE tab on localhost:5199.
// Extends docs/evidence/G1/verifier-shots/cdp.mjs with:
//   - Page.javascriptDialogOpening auto-accept (FIX 4: reset confirm dialog)
//   - throttle on/off (FIX 2: loading state via network throttling)
// Usage: node cdp-pkg.mjs <command> [args]
import { execSync } from "child_process";
import WebSocket from "file:C:/Users/RZ1/.pi/agent/skills/browser-tools/node_modules/ws/index.js";
import fs from "fs";

const [, , cmd, ...args] = process.argv;
const tabs = JSON.parse(execSync('curl -s http://localhost:9222/json/list').toString());
const page = tabs.find(t => t.type === "page" && t.url.includes("localhost:5199")) || tabs.find(t => t.type === "page");
if (!page) { console.error("NO TAB"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
let id = 0; const pending = new Map();
const consoleLog = [];
const dialogs = [];
let dialogPolicy = "accept"; // auto-accept every dialog

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
ws.on("message", (d) => {
  const m = JSON.parse(d);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); return; }
  if (m.method === "Page.javascriptDialogOpening") {
    dialogs.push({ type: m.params.type, message: m.params.message });
    if (dialogPolicy === "accept") send("Page.handleJavaScriptDialog", { accept: true });
    else if (dialogPolicy === "dismiss") send("Page.handleJavaScriptDialog", { accept: false });
  }
  else if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
    consoleLog.push({ type: m.params.type, text: m.params.args.map(a => a.value ?? a.description ?? a.type).join(" ") });
  } else if (m.method === "Runtime.exceptionThrown") {
    consoleLog.push({ type: "exception", text: JSON.stringify(m.params.exceptionDetails).slice(0, 500) });
  }
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
ws.on("open", async () => {
  try {
    await send("Runtime.enable");
    await send("Page.enable");
    switch (cmd) {
      case "eval": {
        const r = await send("Runtime.evaluate", { expression: args[0], awaitPromise: true, returnByValue: true });
        console.log(JSON.stringify(r.result.value ?? r.result, null, 1));
        break;
      }
      case "shot": {
        await sleep(args[1] ? +args[1] : 300);
        const r = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(args[0], Buffer.from(r.data, "base64"));
        console.log("saved " + args[0]);
        break;
      }
      case "mouse": {
        const [type, x, y, btn = "left", clicks = "1"] = args;
        const params = { type, x: +x, y: +y, pointerType: "mouse", clickCount: 1 };
        if (type !== "mouseMoved") { params.button = btn; params.clickCount = +clicks; }
        await send("Input.dispatchMouseEvent", params);
        console.log("mouse " + type + " " + x + "," + y);
        break;
      }
      case "click-el": {
        // click the center of an element matching a CSS selector
        const r = await send("Runtime.evaluate", { expression: `(() => { const el = document.querySelector(${JSON.stringify(args[0])}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`, returnByValue: true });
        if (!r.result.value) { console.error("NO ELEMENT " + args[0]); break; }
        const { x, y } = r.result.value;
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, pointerType: "mouse" });
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, pointerType: "mouse" });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, pointerType: "mouse" });
        console.log(`clicked ${args[0]} at ${x},${y}`);
        break;
      }
      case "key": {
        const [type, code, key = "", mods = ""] = args;
        const modMap = { ctrl: 2, alt: 1, shift: 8, meta: 4 };
        const modifiers = mods.split("+").filter(Boolean).reduce((a, m) => a + (modMap[m] ?? 0), 0);
        if (type === "char") {
          const text = key || code;
          for (const ch of text) {
            await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, unmodifiedText: ch, key: ch, windowsVirtualKeyCode: 0 });
            await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
          }
          console.log("typed: " + key);
        } else {
          const vk = { Escape: 27, Delete: 46, Backspace: 8, KeyZ: 90, KeyY: 89, Tab: 9, Enter: 13, Space: 32 }[code] ?? 0;
          await send("Input.dispatchKeyEvent", { type, code, key: key || code.replace("Key", ""), windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
          console.log(`key ${type} ${code} ${mods}`);
        }
        break;
      }
      case "wheel": {
        const [x, y, dy] = args;
        await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: +x, y: +y, deltaX: 0, deltaY: +dy, pointerType: "mouse" });
        console.log("wheel dy=" + dy);
        break;
      }
      case "throttle": {
        await send("Network.enable");
        if (args[0] === "off") { await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); console.log("throttle off"); }
        else await send("Network.emulateNetworkConditions", { offline: false, latency: 2000, downloadThroughput: 20 * 1024, uploadThroughput: 20 * 1024 }), console.log("throttle on (2s latency, 20KB/s)");
        break;
      }
      case "cpu": {
        await send("Emulation.setCPUThrottlingRate", { rate: args[0] === "off" ? 1 : +args[0] });
        console.log("cpu rate " + args[0]);
        break;
      }
      case "dialogs": console.log(JSON.stringify(dialogs, null, 1)); break;
      case "console": console.log(JSON.stringify(consoleLog, null, 1)); break;
      case "reload": await send("Page.reload", { ignoreCache: false }); console.log("reloading"); await sleep(2500); console.log("CONSOLE:" + JSON.stringify(consoleLog)); break;
      default: console.error("unknown cmd");
    }
  } catch (e) { console.error("ERR " + e.message); }
  setTimeout(() => { ws.close(); process.exit(0); }, cmd === "reload" ? 3000 : 400);
});
ws.on("error", (e) => { console.error("WSERR " + e.message); process.exit(1); });
