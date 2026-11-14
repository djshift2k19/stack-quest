/** Compare printed output fairly: ignore spaces at line ends and blank lines at the end. */
export function sameOutput(a: string, b: string): boolean {
  const clean = (s: string) =>
    s
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .trim();
  return clean(a) === clean(b);
}
