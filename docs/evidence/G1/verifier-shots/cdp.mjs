// Verifier CDP helper — raw DevTools protocol over WebSocket, targets the ACTIVE tab on localhost:5222
// Usage: node cdp.mjs <command> [json-args]
// Commands:
//   eval <expr>                       evaluate in page (async context allowed), print JSON result
//   shot <outfile>                    capture viewport screenshot
//   emulate <w> <h> [clear]           set device metrics (clear=true clears override)
//   mouse <type> <x> <y> [btn] [clicks]   Input.dispatchMouseEvent
//   key <type> <code> [key] [mods]    Input.dispatchKeyEvent (rawKeyDown/keyUp/char)
//   console                           dump captured console/errors
//   reload
import { execSync } from "child_process";
import WebSocket from "file:C:/Users/RZ1/.pi/agent/skills/browser-tools/node_modules/ws/index.js";
import fs from "fs";

const [, , cmd, ...args] = process.argv;
const tabs = JSON.parse(execSync('curl -s http://localhost:9222/json/list').toString());
const page = tabs.find(t => t.type === "page" && t.url.includes("localhost:5222")) || tabs.find(t => t.type === "page");
if (!page) { console.error("NO TAB"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
let id = 0; const pending = new Map();
const consoleLog = [];

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
ws.on("message", (d) => {
  const m = JSON.parse(d);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  else if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
    consoleLog.push({ type: m.params.type, text: m.params.args.map(a => a.value ?? a.description ?? a.type).join(" ") });
  } else if (m.method === "Runtime.exceptionThrown") {
    consoleLog.push({ type: "exception", text: JSON.stringify(m.params.exceptionDetails).slice(0, 500) });
  }
});
ws.on("open", async () => {
  try {
    await send("Runtime.enable");
    switch (cmd) {
      case "eval": {
        const r = await send("Runtime.evaluate", { expression: args[0], awaitPromise: true, returnByValue: true });
        console.log(JSON.stringify(r.result.value ?? r.result, null, 1));
        break;
      }
      case "shot": {
        const r = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(args[0], Buffer.from(r.data, "base64"));
        console.log("saved " + args[0]);
        break;
      }
      case "emulate": {
        const [w, h, clear] = args;
        if (clear === "clear") { await send("Emulation.clearDeviceMetricsOverride"); console.log("emulation cleared"); }
        else { await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: false }); console.log(`viewport ${w}x${h}`); }
        break;
      }
      case "mouse": {
        const [type, x, y, btn = "none", clicks = "1"] = args;
        const params = { type, x: +x, y: +y, button: btn, clickCount: +clicks, pointerType: "mouse" };
        if (type !== "mouseMoved") { params.button = btn; params.clickCount = +clicks; } else { delete params.button; delete params.clickCount; }
        await send("Input.dispatchMouseEvent", params);
        console.log("mouse " + type);
        break;
      }
      case "key": {
        const [type, code, key = "", mods = ""] = args;
        const modMap = { ctrl: 2, alt: 1, shift: 8, meta: 4 };
        const modifiers = mods.split("+").filter(Boolean).reduce((a, m) => a + (modMap[m] ?? 0), 0);
        if (type === "char") {
          const text = key || code;
          for (const ch of text) {
            await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, unmodifiedText: ch, key: ch, windowsVirtualKeyCode: 0, nativeVirtualKeyCode: 0 });
            await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
          }
          console.log("typed: " + key);
        }
        else {
          const vk = { Escape: 27, Delete: 46, Backspace: 8, KeyZ: 90, KeyY: 89, Tab: 9, KeyA: 65, Enter: 13, Space: 32 }[code] ?? 0;
          await send("Input.dispatchKeyEvent", { type, code, key: key || code.replace("Key", ""), windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
        }
        console.log(`key ${type} ${code} ${mods}`);
        break;
      }
      case "wheel": {
        const [x, y, dy] = args;
        await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: +x, y: +y, deltaX: 0, deltaY: +dy, pointerType: "mouse" });
        console.log("wheel dy=" + dy);
        break;
      }
      case "initscript": {
        await send("Page.enable");
        await send("Page.addScriptToEvaluateOnNewDocument", { source: args[0] });
        console.log("init script installed");
        break;
      }
      case "console": console.log(JSON.stringify(consoleLog, null, 1)); break;
      case "reload": await send("Page.enable"); await send("Page.reload", { ignoreCache: true }); console.log("reloading"); setTimeout(()=>{console.log("CONSOLE:"+JSON.stringify(consoleLog));},2000); break;
      case "console2": console.log(JSON.stringify(consoleLog, null, 1)); break;
      default: console.error("unknown cmd");
    }
  } catch (e) { console.error("ERR " + e.message); }
  setTimeout(() => { ws.close(); process.exit(0); }, cmd === "reload" ? 2500 : 300);
});
ws.on("error", (e) => { console.error("WSERR " + e.message); process.exit(1); });