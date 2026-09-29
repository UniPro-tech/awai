import { describe, expect, it } from "vitest";
import { buildPdfFromJpegs } from "./pdf";

describe("buildPdfFromJpegs", () => {
  it("creates a multi-page PDF with an xref and trailer", () => {
    const bytes = buildPdfFromJpegs([
      { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 10, height: 10 },
      { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 10, height: 10 },
    ]);
    const text = new TextDecoder("latin1").decode(bytes);

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text).toContain("xref");
    expect(text.endsWith("%%EOF")).toBe(true);
  });
});
