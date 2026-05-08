import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../src/crawl.js", () => ({
  crawl: vi.fn(),
}));

vi.mock("../src/utils/checkHost.js", () => ({
  default: vi.fn(() => vi.fn(() => true)),
}));

vi.mock("../src/utils/fetchUrl.js", () => ({
  default: vi.fn(),
}));

vi.mock("../src/utils/extractLinks.js", () => ({
  default: vi.fn(),
}));

import { app } from "../src/app.js";
import { crawl } from "../src/crawl.js";
import checkHost from "../src/utils/checkHost.js";

const mockedCrawl = vi.mocked(crawl);
const mockedCheckHost = vi.mocked(checkHost);

describe("GET /crawl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Returns errorwhen url query param is missing", async () => {
    const response = await request(app).get("/crawl");

    expect(response.status).toBe(200);

    expect(response.text).toContain(
      `event: crawl-error\ndata: ${JSON.stringify({
        error: "Missing URL",
      })}`,
    );

    expect(mockedCrawl).not.toHaveBeenCalled();
  });

  it("Returns error when url is invalid", async () => {
    const response = await request(app).get("/crawl").query({
      url: "not-a-url",
    });

    expect(response.status).toBe(200);

    expect(response.text).toContain(
      `event: crawl-error\ndata: ${JSON.stringify({
        error: "Invalid URL",
      })}`,
    );

    expect(mockedCrawl).not.toHaveBeenCalled();
  });

  it("Streams crawl results and sends an end event", async () => {
    mockedCrawl.mockImplementationOnce(async (_startUrl, helpers) => {
      helpers.onPage?.({
        url: "https://example.com/",
        links: ["https://example.com/about", "https://example.com/contact"],
      });

      helpers.onPage?.({
        url: "https://example.com/about",
        links: [],
      });

      return [
        {
          url: "https://example.com/",
          links: ["https://example.com/about", "https://example.com/contact"],
        },
        {
          url: "https://example.com/about",
          links: [],
        },
      ];
    });

    const response = await request(app).get("/crawl").query({
      url: "https://example.com",
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.headers.connection).toBe("keep-alive");

    expect(response.text).toContain(
      `data: ${JSON.stringify({
        url: "https://example.com/",
        links: ["https://example.com/about", "https://example.com/contact"],
      })}`,
    );

    expect(response.text).toContain(
      `data: ${JSON.stringify({
        url: "https://example.com/about",
        links: [],
      })}`,
    );

    expect(response.text).toContain(
      `event: end\ndata: ${JSON.stringify({ total: 2 })}`,
    );

    expect(mockedCrawl).toHaveBeenCalledTimes(1);
    expect(mockedCrawl).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({
        fetchUrl: expect.any(Function),
        extractLinks: expect.any(Function),
        validDomain: expect.any(Function),
        onPage: expect.any(Function),
      }),
      expect.objectContaining({
        concurrency: expect.any(Number),
      }),
    );
  });

  it("Creates a validDomain function from the start URL", async () => {
    mockedCrawl.mockResolvedValueOnce([]);

    await request(app).get("/crawl").query({
      url: "https://example.com",
    });

    expect(mockedCheckHost).toHaveBeenCalledTimes(1);
    expect(mockedCheckHost).toHaveBeenCalledWith("https://example.com/");
  });

  it("Streams an error event when crawl fails", async () => {
    mockedCrawl.mockRejectedValueOnce(new Error("crawl failed"));

    const response = await request(app).get("/crawl").query({
      url: "https://example.com",
    });

    expect(response.status).toBe(200);
    expect(response.text).toContain(
      `event: crawl-error\ndata: ${JSON.stringify({ error: "crawl failed" })}`,
    );
  });
});
