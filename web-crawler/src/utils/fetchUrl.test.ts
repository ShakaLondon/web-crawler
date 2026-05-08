import { afterEach, describe, expect, it, vi } from "vitest";
import fetchUrl from "./fetchUrl.js";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

describe("fetchUrl", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("Fetches HTML and returns the response body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
      headers: {
        get: vi.fn(() => "text/html; charset=utf-8"),
      },
      text: vi.fn(async () => "<html>Hello</html>"),
    });

    const result = await fetchUrl("https://example.com");

    expect(result).toBe("<html>Hello</html>");

    expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
      signal: expect.any(AbortSignal),
      redirect: "follow",
      headers: { "User-Agent": "web-crawler/1.0" },
    });
  });

  it("Throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
      headers: {
        get: vi.fn(() => "text/html"),
      },
      text: vi.fn(),
    });

    await expect(fetchUrl("https://example.com/missing")).rejects.toThrow(
      "Error fetching https://example.com/missing: Failed to fetch https://example.com/missing: Not Found",
    );
  });

  it("Throws when response is not HTML", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
      headers: {
        get: vi.fn(() => "application/json"),
      },
      text: vi.fn(),
    });

    await expect(fetchUrl("https://example.com/api")).rejects.toThrow(
      "Error fetching https://example.com/api: URL https://example.com/api did not return HTML content",
    );
  });

  it("Throws when content-type header is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
      headers: {
        get: vi.fn(() => null),
      },
      text: vi.fn(),
    });

    await expect(fetchUrl("https://example.com")).rejects.toThrow(
      "Error fetching https://example.com: URL https://example.com did not return HTML content",
    );
  });

  it("Throws a timeout error when the request is aborted", async () => {
    vi.useFakeTimers();

    mockFetch.mockImplementationOnce(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const expectation = expect(
      fetchUrl("https://example.com/slow"),
    ).rejects.toThrow("Request to https://example.com/slow timed out");

    await vi.advanceTimersByTimeAsync(5000);

    await expectation;
  });

  it("FetchUrl errors handled", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    await expect(fetchUrl("https://example.com")).rejects.toThrow(
      "Error fetching https://example.com: network down",
    );
  });

  it("Handles fetch failures", async () => {
    mockFetch.mockRejectedValueOnce("failed");

    await expect(fetchUrl("https://example.com")).rejects.toThrow(
      "Unknown error fetching https://example.com",
    );
  });

  it("Clears the timeout after a successful fetch", async () => {
    vi.useFakeTimers();

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
      headers: {
        get: vi.fn(() => "text/html"),
      },
      text: vi.fn(async () => "<html></html>"),
    });

    await fetchUrl("https://example.com");

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
