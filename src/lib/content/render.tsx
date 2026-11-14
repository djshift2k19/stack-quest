/**
 * Turns the MDX text of a lesson into React elements.
 * This runs while the site is being built, never in the browser.
 *
 * Note: MDX can contain code, so only trusted lesson files from the
 * content/ folder are rendered here, never text typed in by a learner.
 */

import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { mdxComponents } from "@/components/lesson/MdxComponents";
import type { GlossaryEntry } from "./schema";

export async function renderMdx(source: string, glossary: GlossaryEntry[]) {
  const { default: Content } = await evaluate(source, { ...runtime });
  return <Content components={mdxComponents(glossary)} />;
}
