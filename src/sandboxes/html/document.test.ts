import { describe, expect, it } from "vitest";
import { buildPreviewDocument, injectIntoHead } from "./document";

describe("HTML preview document", () => {
  it("puts the security policy inside the learner's <head>, keeping the doctype first", () => {
    const doc = buildPreviewDocument({ language: "html", code: "<!doctype html><html><head><title>Me</title></head><body><h1>Hi</h1></body></html>" });
    expect(doc.startsWith("<!doctype html>")).toBe(true);
    expect(doc.indexOf("Content-Security-Policy")).toBeLessThan(doc.indexOf("<title>"));
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain("form-action 'none'");
  });

  it("works with a fragment that has no <head>", () => {
    const doc = injectIntoHead("<h1>Hi</h1>", "<meta>");
    expect(doc).toBe("<!doctype html><head><meta></head><h1>Hi</h1>");
  });

  it("adds the learner's CSS to the fixture for CSS challenges", () => {
    const doc = buildPreviewDocument({ language: "css", code: "h1 { color: green; }", fixture: "<html><head></head><body><h1>Hi</h1></body></html>" });
    expect(doc).toContain("<style>h1 { color: green; }</style>");
  });

  it("only includes the checking script when there are tests", () => {
    expect(buildPreviewDocument({ language: "html", code: "<p>x</p>" })).not.toContain("html-result");
    expect(buildPreviewDocument({ language: "html", code: "<p>x</p>", tests: [{ name: "t", code: "expect(1).toBe(1)" }] })).toContain("html-result");
  });

  it("can't be broken out of with a closing script tag in a test", () => {
    const doc = buildPreviewDocument({ language: "html", code: "<p>x</p>", tests: [{ name: "</script><b>", code: "" }] });
    expect(doc).not.toContain("</script><b>");
  });
});
