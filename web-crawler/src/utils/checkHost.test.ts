import { describe, expect, it } from "vitest";
import checkHost from "./checkHost.js";

describe("checkHost", () => {
  it("Should return true for URLs with the same host and HTTP protocol", () => {
    const checker = checkHost("https://example.com");
    expect(checker("http://example.com")).toBe(true);
    expect(checker("http://example.com/path")).toBe(true);
    expect(checker("https://example.com/path?query=1")).toBe(true);
  });

  it("Should return false for URLs with different hosts", () => {
    const checker = checkHost("https://example.com");
    expect(checker("https://google.com")).toBe(false);
    expect(checker("http://sub.example.com")).toBe(false);
  });

  it("Should return false for URLs with invalid protocols", () => {
    const checker = checkHost("https://example.com");
    expect(checker("ftp://example.com")).toBe(false);
    expect(checker("file:///path")).toBe(false);
  });

  it("Should return false for incorrectly formatted URLs", () => {
    const checker = checkHost("https://example.com");
    expect(checker("not-a-url")).toBe(false);
    expect(checker("")).toBe(false);
  });

  it("Should handle different initial hosts correctly", () => {
    const checker = checkHost("http://example.com");
    expect(checker("https://example.com")).toBe(true);
    expect(checker("http://other.com")).toBe(false);
  });
});
