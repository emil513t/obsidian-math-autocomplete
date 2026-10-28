// Drives a running Obsidian (started with --remote-debugging-port=9333) to
// live-test the math-autocomplete popup in a throwaway note.
import fs from "node:fs";

const OUT = process.argv[2];
const list = await (await fetch("http://127.0.0.1:9333/json")).json();
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) =>
  new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = async (k, code, vk) => {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk });
  if (k === "Enter") await send("Input.dispatchKeyEvent", { type: "char", text: "\r" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
};
const type = async (s) => { for (const ch of s) { await send("Input.insertText", { text: ch }); await sleep(60); } };
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64"));
};
const popup = () => ev(`[...document.querySelectorAll('.suggestion-container .mac-item')].map(e => e.querySelector('code').textContent + (e.querySelector('mjx-container') ? ' [rendered]' : ''))`);
const doc = () => ev(`(() => { const e = app.workspace.activeEditor.editor; const c = e.getCursor(); return { text: e.getValue(), cursor: c }; })()`);

const results = [];
const check = (name, ok, info) => { results.push({ name, ok, info }); console.log(ok ? "PASS" : "FAIL", name, info ?? ""); };

// Wait for the plugin to load and finish its vault scan.
for (let i = 0; i < 40; i++) {
  if (await ev(`!!app.plugins.plugins['math-autocomplete']?.stats?.cmds?.size`)) break;
  await sleep(500);
}
const size = await ev(`app.plugins.plugins['math-autocomplete'].stats.cmds.size`);
check("plugin loaded + vault scanned", size > 50, `${size} commands`);
const lsOn = await ev(`!!app.plugins.plugins['obsidian-latex-suite']`);
check("LaTeX Suite also loaded", lsOn);

// Fresh scratch note.
const P = "_math-autocomplete-test.md";
await ev(`(async () => { const f = app.vault.getAbstractFileByPath('${P}'); if (f) await app.vault.delete(f); const nf = await app.vault.create('${P}', 'Test\\n\\n$$\\n\\n$$\\n'); await app.workspace.getLeaf(true).openFile(nf); })()`);
await sleep(800);
await ev(`(() => { const v = app.workspace.activeLeaf.view; if (v.getMode && v.getMode() !== 'source') v.setState({...v.getState(), mode:'source'}, {}); })()`);
await sleep(300);
await ev(`(() => { const e = app.workspace.activeEditor.editor; e.focus(); e.setCursor({line:3, ch:0}); })()`);
await sleep(200);

// 1) \fr in display math -> popup with rendered previews
await type("\\fr");
await sleep(700);
let items = await popup();
check("popup appears for \\fr in $$", items.length > 0, items.slice(0, 4).join(" | "));
check("previews rendered with MathJax", items.some((s) => s.includes("[rendered]")));
await shot("1-popup-fr");

// 2) Enter -> \frac{}{} with cursor inside first {}
await key("Enter", "Enter", 13);
await sleep(300);
let d = await doc();
const line = d.text.split("\n")[3];
check("Enter inserts \\frac{}{}", line === "\\frac{}{}", JSON.stringify(line));
check("cursor lands in first {}", d.cursor.line === 3 && d.cursor.ch === 6, JSON.stringify(d.cursor));

// 3) Outside math: no popup
await ev(`(() => { const e = app.workspace.activeEditor.editor; e.setCursor({line:0, ch:4}); })()`);
await type(" \\fr");
await sleep(600);
items = await popup();
check("no popup outside math", items.length === 0, items.join(" | "));
await key("Escape", "Escape", 27);

// 4) Vault-learned suggestion: \mathbb in inline math should offer \mathbb{R}
await ev(`(() => { const e = app.workspace.activeEditor.editor; e.setValue('Inline $x \\\\in $ end\\n'); e.setCursor({line:0, ch:14}); })()`);
await sleep(200);
await type("\\ma");
await sleep(700);
items = await popup();
check("inline math popup offers \\mathbb{R} from vault", items.some((s) => s.startsWith("\\mathbb{R}")), items.slice(0, 5).join(" | "));
await shot("2-popup-ma-inline");
await key("Escape", "Escape", 27);

// 5) Fully typed \alpha -> no popup, so Enter still makes a newline
await ev(`(() => { const e = app.workspace.activeEditor.editor; e.setValue('$$\\n\\n$$\\n'); e.setCursor({line:1, ch:0}); })()`);
await type("\\alpha");
await sleep(600);
items = await popup();
check("no popup after complete \\alpha", items.length === 0, items.join(" | "));
await key("Enter", "Enter", 13);
await sleep(300);
d = await doc();
check("Enter after \\alpha makes a newline", d.text.startsWith("$$\n\\alpha\n"), JSON.stringify(d.text));

// 6) \\ (LaTeX newline) must not trigger
await ev(`(() => { const e = app.workspace.activeEditor.editor; e.setValue('$$\\na \\\\\\\\b\\n$$\\n'); e.setCursor({line:1, ch:5}); })()`);
await sleep(300);
await type("x");
items = await popup();
check("no popup after \\\\ newline", items.length === 0, JSON.stringify((await doc()).text));

// Cleanup the scratch note and pick-boosts the test created.
await ev(`(async () => { app.workspace.activeLeaf.detach(); const f = app.vault.getAbstractFileByPath('${P}'); if (f) await app.vault.delete(f); const p = app.plugins.plugins['math-autocomplete']; p.settings.boosts = {}; await p.saveSettings(); })()`);
const errs = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - errs}/${results.length} passed`);
ws.close();
process.exit(errs ? 1 : 0);
