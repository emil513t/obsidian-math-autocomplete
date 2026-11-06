// Tab / Shift+Tab between ⟨placeholders⟩ of a freshly inserted template.
// A "session" is the inserted region (mapped through edits) plus the
// placeholder currently being filled, so we can copy its value into others
// with the same label.
import { StateEffect, StateField, Prec, EditorSelection } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { nextPlaceholder, mirrorChanges, placeholders } from "./templates.js";

const setSession = StateEffect.define();

const sessionField = StateField.define({
  create: () => null,
  update(s, tr) {
    for (const e of tr.effects) if (e.is(setSession)) return e.value;
    if (!s || !tr.docChanged) return s;
    const m = tr.changes;
    return {
      from: m.mapPos(s.from, -1),
      to: m.mapPos(s.to, 1),
      cur: s.cur && { label: s.cur.label, from: m.mapPos(s.cur.from, -1), to: m.mapPos(s.cur.to, 1) },
    };
  },
});

function jump(view, dir) {
  let s = view.state.field(sessionField, false);
  if (!s) return false;
  const head = view.state.selection.main.head;
  // Only act while the cursor is inside the template; elsewhere Tab is Tab.
  if (head < s.from || head > s.to) {
    view.dispatch({ effects: setSession.of(null) });
    return false;
  }

  // 1) Copy what was typed into the current placeholder to its namesakes.
  if (s.cur) {
    const value = view.state.doc.sliceString(s.cur.from, s.cur.to);
    const text = view.state.doc.sliceString(s.from, s.to);
    const changes = mirrorChanges(text, s.cur.label, value).map((c) => ({ ...c, from: c.from + s.from, to: c.to + s.from }));
    if (changes.length) {
      view.dispatch({ changes, userEvent: "input.template" });
      s = view.state.field(sessionField);
    }
  }

  // 2) Select the next (or previous) placeholder.
  const text = view.state.doc.sliceString(s.from, s.to);
  const pos = (dir > 0 ? (s.cur ? s.cur.to : view.state.selection.main.head) : (s.cur ? s.cur.from : head)) - s.from;
  const p = nextPlaceholder(text, pos, dir);
  if (!p) {
    // Everything filled: leave the cursor at the end of the template.
    view.dispatch({ selection: { anchor: s.to }, effects: setSession.of(null), scrollIntoView: true });
    return true;
  }
  const from = s.from + p.from;
  const to = s.from + p.to;
  view.dispatch({
    selection: EditorSelection.single(from, to),
    effects: setSession.of({ from: s.from, to: s.to, cur: { label: p.label, from, to } }),
    scrollIntoView: true,
  });
  return true;
}

export const tabstopExtension = [
  sessionField,
  Prec.highest(
    keymap.of([
      { key: "Tab", run: (v) => jump(v, 1) },
      { key: "Shift-Tab", run: (v) => jump(v, -1) },
    ]),
  ),
];

// Called right after inserting a template at [from, to) of the doc.
export function startSession(view, from, to) {
  view.dispatch({ effects: setSession.of({ from, to, cur: null }) });
  const text = view.state.doc.sliceString(from, to);
  if (placeholders(text).length) jump(view, 1);
  else view.dispatch({ selection: { anchor: to }, effects: setSession.of(null) });
}
