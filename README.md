# Math Autocomplete (Obsidian)

Popup autocomplete for LaTeX commands inside `$...$` / `$$...$$`, with MathJax previews,
ranked by what you actually use in your vault. Works alongside LaTeX Suite.

- `npm run build` — bundle to `dist/main.js`
- `npm run install-vault` — copy into the vault's plugins folder
- `npm test` — unit tests (incl. a scan of the real vault)
- Live test: start Obsidian with `Obsidian.exe --remote-debugging-port=9333`, then
  `node scripts/live-test.mjs <screenshot-dir>` (creates and deletes a scratch note)

Planned: snippet miner that exports your most-repeated expressions as LaTeX Suite snippets.
