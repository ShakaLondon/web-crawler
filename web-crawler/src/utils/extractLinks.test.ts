import { describe, expect, it } from "vitest";
import extractLinks from "./extractLinks.js";

describe("extractLinks", () => {
  it("Extracts absolute http and https links", () => {
    const html = `
      <a href="https://example.com/about">About</a>
      <a href="http://example.com/contact">Contact</a>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual([
      "https://example.com/about",
      "http://example.com/contact",
    ]);
  });

  it("Resolves relative links against the base URL", () => {
    const html = `
      <a href="/about">About</a>
      <a href="contact">Contact</a>
    `;

    const result = extractLinks("https://example.com/docs/page", html);

    expect(result).toEqual([
      "https://example.com/about",
      "https://example.com/docs/contact",
    ]);
  });

  it("Removes URL fragments", () => {
    const html = `
      <a href="/about#team">Team</a>
      <a href="https://example.com/contact#form">Form</a>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual([
      "https://example.com/about",
      "https://example.com/contact",
    ]);
  });

  it("Deduplicates links", () => {
    const html = `
      <a href="/about">About 1</a>
      <a href="https://example.com/about">About 2</a>
      <a href="/about#team">About 3</a>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual(["https://example.com/about"]);
  });

  it("Ignores non-http links", () => {
    const html = `
      <a href="mailto:test@example.com">Email</a>
      <a href="tel:123456789">Phone</a>
      <a href="javascript:alert(1)">Bad</a>
      <a href="/valid">Valid</a>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual(["https://example.com/valid"]);
  });

  it("Ignores anchors without href", () => {
    const html = `
      <a>No href</a>
      <a href="">Empty href</a>
      <a href="/valid">Valid</a>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual(["https://example.com/valid"]);
  });

  it("Preserves query parameters", () => {
    const html = `
      <a href="/products?sort=asc&page=2#top">Products</a>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual(["https://example.com/products?sort=asc&page=2"]);
  });

  it("Returns an empty array when there are no links", () => {
    const html = `
      <html>
        <body>
          <p>No links here</p>
        </body>
      </html>
    `;

    const result = extractLinks("https://example.com", html);

    expect(result).toEqual([]);
  });

  it("Throws when the base URL is invalid", () => {
    const html = `<a href="/about">About</a>`;

    expect(() => extractLinks("not-a-url", html)).toThrow(
      "Unable to access URL found in not-a-url: /about",
    );
  });

  it("Throws when an href cannot be parsed", () => {
    const html = `<a href="http://[invalid-url">Broken</a>`;

    expect(() => extractLinks("https://example.com", html)).toThrow(
      "Unable to access URL found in https://example.com: http://[invalid-url",
    );
  });
});
