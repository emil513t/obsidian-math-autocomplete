// Copies the built plugin into the vault's plugins folder.
import fs from "node:fs";
const dest = "C:/Users/emill/OneDrive/Desktop/CS Shit/Obsidian/Emil/.obsidian/plugins/math-autocomplete";
fs.mkdirSync(dest, { recursive: true });
for (const [src, name] of [["dist/main.js", "main.js"], ["manifest.json", "manifest.json"], ["styles.css", "styles.css"]]) {
  fs.copyFileSync(src, `${dest}/${name}`);
}
console.log("installed to", dest);
