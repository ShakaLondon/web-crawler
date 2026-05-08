import { describe, expect, it, vi } from "vitest";
import { crawl, type CrawlFunctions } from "../src/crawl.js";

const START = "https://example.com/";

const createHelpers = (
  graph: Record<string, string[]>,
  overrides: Partial<CrawlFunctions> = {},
): CrawlFunctions => {
  return {
    fetchUrl: vi.fn(async (url: string) => {
      if (!(url in graph)) {
        throw new Error(`Unexpected fetch: ${url}`);
      }

      return `<html>${url}</html>`;
    }),

    extractLinks: vi.fn((baseUrl: string) => graph[baseUrl] ?? []),

    validDomain: vi.fn((url: string) => url.startsWith("https://example.com")),

    ...overrides,
  };
};

describe("crawl", () => {
  it("Returns only the start URL when no links are discovered", async () => {
    const helpers = createHelpers({
      [START]: [],
    });

    const result = await crawl(START, helpers);

    expect(result).toEqual([{ url: START, links: [] }]);
    expect(helpers.fetchUrl).toHaveBeenCalledTimes(1);
    expect(helpers.fetchUrl).toHaveBeenCalledWith(START);
  });

  it("Crawl adds allowed links to result", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/about", "https://example.com/contact"],
      "https://example.com/about": [],
      "https://example.com/contact": [],
    });

    const result = await crawl(START, helpers, {
      concurrency: 2,
      maxPages: 10,
    });

    expect(result).toEqual([
      {
        url: START,
        links: ["https://example.com/about", "https://example.com/contact"],
      },
      { url: "https://example.com/about", links: [] },
      { url: "https://example.com/contact", links: [] },
    ]);

    expect(helpers.fetchUrl).toHaveBeenCalledTimes(3);
  });

  it("Does not crawl URLs outside the valid domain", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/about", "https://evil.com/phishing"],
      "https://example.com/about": [],
    });

    const result = await crawl(START, helpers);

    expect(result).toEqual([
      { url: START, links: ["https://example.com/about"] },
      { url: "https://example.com/about", links: [] },
    ]);

    expect(helpers.fetchUrl).not.toHaveBeenCalledWith(
      "https://evil.com/phishing",
    );
  });

  it("Deduplicates repeated links from the same page", async () => {
    const helpers = createHelpers({
      [START]: [
        "https://example.com/a",
        "https://example.com/a",
        "https://example.com/a",
      ],
      "https://example.com/a": [],
    });

    const result = await crawl(START, helpers);

    expect(result).toEqual([
      { url: START, links: ["https://example.com/a"] },
      { url: "https://example.com/a", links: [] },
    ]);

    expect(helpers.fetchUrl).toHaveBeenCalledTimes(2);
  });

  it("Displays all links on a page, but does not visit them if already visited", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a"],
      "https://example.com/a": [START],
    });

    const result = await crawl(START, helpers);

    expect(result).toEqual([
      { url: START, links: ["https://example.com/a"] },
      { url: "https://example.com/a", links: [START] },
    ]);

    expect(helpers.fetchUrl).toHaveBeenCalledTimes(2);
  });

  it("Deduplicates links discovered from different pages", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a", "https://example.com/b"],
      "https://example.com/a": ["https://example.com/shared"],
      "https://example.com/b": ["https://example.com/shared"],
      "https://example.com/shared": [],
    });

    const result = await crawl(START, helpers, {
      concurrency: 2,
    });

    expect(result).toEqual([
      {
        url: START,
        links: ["https://example.com/a", "https://example.com/b"],
      },
      {
        url: "https://example.com/a",
        links: ["https://example.com/shared"],
      },
      {
        url: "https://example.com/b",
        links: ["https://example.com/shared"],
      },
      {
        url: "https://example.com/shared",
        links: [],
      },
    ]);

    expect(helpers.fetchUrl).toHaveBeenCalledTimes(4);
  });

  it("Enforces maxPages limit", async () => {
    const helpers = createHelpers({
      [START]: [
        "https://example.com/a",
        "https://example.com/b",
        "https://example.com/c",
      ],
      "https://example.com/a": [],
      "https://example.com/b": [],
      "https://example.com/c": [],
    });

    const result = await crawl(START, helpers, {
      maxPages: 2,
      concurrency: 1,
    });

    expect(result).toEqual([
      {
        url: START,
        links: [
          "https://example.com/a",
          "https://example.com/b",
          "https://example.com/c",
        ],
      },
      { url: "https://example.com/a", links: [] },
    ]);

    expect(result).toHaveLength(2);
  });

  it("Calls onPage with each batch of newly discovered results", async () => {
    const onPage = vi.fn();

    const helpers = createHelpers(
      {
        [START]: ["https://example.com/a"],
        "https://example.com/a": ["https://example.com/b"],
        "https://example.com/b": [],
      },
      { onPage },
    );

    await crawl(START, helpers, {
      concurrency: 1,
    });

    expect(onPage).toHaveBeenNthCalledWith(1, {
      url: START,
      links: ["https://example.com/a"],
    });

    expect(onPage).toHaveBeenNthCalledWith(2, {
      url: "https://example.com/a",
      links: ["https://example.com/b"],
    });

    expect(onPage).toHaveBeenNthCalledWith(3, {
      url: "https://example.com/b",
      links: [],
    });
  });

  it("Continues crawling when one page fails and calls onError", async () => {
    const onError = vi.fn();

    const helpers = createHelpers(
      {
        [START]: ["https://example.com/good", "https://example.com/bad"],
        "https://example.com/good": [],
        "https://example.com/bad": [],
      },
      {
        fetchUrl: vi.fn(async (url: string) => {
          if (url === "https://example.com/bad") {
            throw new Error("network failed");
          }

          return `<html>${url}</html>`;
        }),
        onError,
      },
    );

    const result = await crawl(START, helpers, {
      concurrency: 1,
    });

    expect(result).toEqual([
      {
        url: START,
        links: ["https://example.com/good", "https://example.com/bad"],
      },
      { url: "https://example.com/good", links: [] },
    ]);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      "https://example.com/bad",
      expect.any(Error),
    );
  });

  it("Handles extractLinks when there are no more links by returning an empty array", async () => {
    const helpers = createHelpers({
      [START]: [],
    });

    const result = await crawl(START, helpers);

    expect(result).toEqual([{ url: START, links: [] }]);
  });

  it("Minimum concurrency is 1", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a"],
      "https://example.com/a": [],
    });

    const result = await crawl(START, helpers, {
      concurrency: 0,
    });

    expect(result).toEqual([
      { url: START, links: ["https://example.com/a"] },
      { url: "https://example.com/a", links: [] },
    ]);
  });

  it("Minimum pages is 1", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a"],
      "https://example.com/a": [],
    });

    const result = await crawl(START, helpers, {
      maxPages: -10,
    });

    expect(result).toEqual([{ url: START, links: ["https://example.com/a"] }]);
  });

  it("Stops after maxTime is reached", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a"],
      "https://example.com/a": [],
    });

    const result = await crawl(START, helpers, {
      maxTime: 0,
    });

    expect(result).toEqual([]);
    expect(helpers.fetchUrl).not.toHaveBeenCalled();
  });

  it("Does not include invalid links in results", async () => {
    const helpers = createHelpers({
      [START]: [
        "https://example.com/a",
        "mailto:test@example.com",
        "javascript:alert(1)",
      ],
      "https://example.com/a": [],
    });

    const result = await crawl(START, helpers);

    expect(result).toEqual([
      { url: START, links: ["https://example.com/a"] },
      { url: "https://example.com/a", links: [] },
    ]);
  });

  it("Extracts links using the current page URL as the base URL", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a"],
      "https://example.com/a": [],
    });

    await crawl(START, helpers);

    expect(helpers.extractLinks).toHaveBeenCalledWith(
      START,
      `<html>${START}</html>`,
    );

    expect(helpers.extractLinks).toHaveBeenCalledWith(
      "https://example.com/a",
      "<html>https://example.com/a</html>",
    );
  });

  it("Stops crawling when cancelled", async () => {
    const helpers = createHelpers({
      [START]: ["https://example.com/a"],
      "https://example.com/a": [],
    });

    const result = await crawl(START, helpers, {
      isCancelled: () => true,
    });

    expect(result).toEqual([]);
    expect(helpers.fetchUrl).not.toHaveBeenCalled();
  });

  it("Stops crawling remaining queued pages when cancelled after first page", async () => {
    let cancelled = false;

    const helpers = createHelpers(
      {
        [START]: ["https://example.com/a", "https://example.com/b"],
        "https://example.com/a": [],
        "https://example.com/b": [],
      },
      {
        onPage: () => {
          cancelled = true;
        },
      },
    );

    const result = await crawl(START, helpers, {
      concurrency: 1,
      isCancelled: () => cancelled,
    });

    expect(result).toEqual([
      {
        url: START,
        links: ["https://example.com/a", "https://example.com/b"],
      },
    ]);

    expect(helpers.fetchUrl).toHaveBeenCalledTimes(1);
  });
});
