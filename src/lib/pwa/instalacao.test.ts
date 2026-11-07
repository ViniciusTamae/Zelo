import { describe, expect, it } from "vitest";

import { ehIphone } from "./instalacao";

describe("ehIphone", () => {
  it("reconhece iPhone e iPad, inclusive o iPad que se apresenta como Mac", () => {
    expect(ehIphone("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(ehIphone("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
    expect(ehIphone("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe(true);
  });

  it("não confunde com Mac de verdade nem Android", () => {
    expect(ehIphone("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe(false);
    expect(ehIphone("Mozilla/5.0 (Linux; Android 14; Pixel 7)", "Linux armv8l", 5)).toBe(false);
  });
});
