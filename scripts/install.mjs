// Copies the built plugin into the vault's plugins folder.
import fs from "node:fs";
const vault = process.env.OBSIDIAN_VAULT;
if (!vault) { console.error("Set OBSIDIAN_VAULT to your vault folder"); process.exit(1); }
const dest = `${vault}/.obsidian/plugins/math-autocomplete`;
fs.mkdirSync(dest, { recursive: true });
for (const [src, name] of [["dist/main.js", "main.js"], ["manifest.json", "manifest.json"], ["styles.css", "styles.css"]]) {
  fs.copyFileSync(src, `${dest}/${name}`);
}
console.log("installed to", dest);
