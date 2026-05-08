import { describe, expect, it } from "vitest";
import { normaliseUrl, validateUrl } from "./url.js";

describe("validateUrl", () => {
  it.each([
    ["https://example.com", "https://example.com/"],
    ["http://example.com", "http://example.com/"],
    ["  https://example.com/path  ", "https://example.com/path"],
    ["https://sub.example.com", "https://sub.example.com/"],
    ["https://example.hello", "https://example.hello/"],
    ["https://example.co.uk", "https://example.co.uk/"],
  ])("Accepts valid URLs", (input, expected) => {
    const result = validateUrl(input);

    expect(result).toBeInstanceOf(URL);
    expect(result && result.toString()).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "not-a-url",
    "example.com",
    "www.example.com",
    "ftp://example.com",
    "mailto:test@example.com",
    "javascript:alert(1)",
    "https://localhost",
    "https://example",
    "https://.com",
    "https://example..com",
    "https://example.",
  ])("rejects invalid URL %s", (input) => {
    expect(validateUrl(input)).toBe(false);
  });
});

describe("normaliseUrl", () => {
  it.each([
    ["https://example.com", "https://example.com/"],
    ["https://example.com/", "https://example.com/"],
    ["https://example.com/about/", "https://example.com/about"],
    ["https://example.com/about///", "https://example.com/about"],
    ["https://EXAMPLE.com/about", "https://example.com/about"],
    ["https://example.com/about#section", "https://example.com/about"],
    ["https://example.com/about/?a=1", "https://example.com/about?a=1"],
  ])("Normalises URLs", (input, expected) => {
    expect(normaliseUrl(input)).toBe(expected);
  });

  it("Keeps query parameters", () => {
    expect(normaliseUrl("https://example.com/products?sort=asc")).toBe(
      "https://example.com/products?sort=asc",
    );
  });

  it("Throws when given an invalid URL", () => {
    expect(() => normaliseUrl("not-a-url")).toThrow("Invalid URL");
  });

  it("Throws when given an unsupported URL format", () => {
    expect(() => normaliseUrl("mailto:test@example.com")).not.toThrow(
      "Invalid URL",
    );
  });
});
