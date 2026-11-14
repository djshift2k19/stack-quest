"use client";

/**
 * The code editor (CodeMirror 6). It's only downloaded on pages that need
 * it, so reading-only lessons stay small.
 *
 * Keyboard note: Tab moves focus out of the editor (so keyboard users never
 * get stuck). Use the editor's auto-indent, or type spaces, to indent.
 */

import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { sql } from "@codemirror/lang-sql";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import type { Language } from "@/lib/content/schema";

const LANGUAGE_SUPPORT = {
  javascript: () => javascript(),
  html: () => html(),
  css: () => css(),
  sql: () => sql(),
} satisfies Record<Language, () => unknown>;

const theme = EditorView.theme({
  "&": {
    backgroundColor: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "15px",
  },
  "&.cm-focused": { outline: "3px solid var(--focus)", outlineOffset: "2px" },
  ".cm-content": { fontFamily: "var(--font-mono)", caretColor: "var(--text)", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted)", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--text)" },
  ".cm-scroller": { minHeight: "var(--editor-min-height, 120px)" },
});

export default function CodeEditor({
  value,
  onChange,
  language,
  label,
  readOnly = false,
  minHeight = 120,
}: {
  value: string;
  onChange?: (value: string) => void;
  language: Language;
  label: string;
  readOnly?: boolean;
  minHeight?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create the editor once.
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          LANGUAGE_SUPPORT[language](),
          theme,
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor is created once; later value changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, label]);

  // If the value is changed from outside (e.g. "Reset"), update the editor.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} style={{ "--editor-min-height": `${minHeight}px` } as React.CSSProperties} />;
}
