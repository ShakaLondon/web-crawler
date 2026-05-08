import { describe, expect, it, vi, beforeEach } from "vitest";
import { crawl } from "./api";
import type { CrawlResult } from "../components/CrawlerOutput/CrawlerOutput";

class MockEventSource {
  static last: MockEventSource | null = null;
  url: string;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  private listeners = new Map<string, (event: any) => void>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.last = this;
  }

  addEventListener(type: string, listener: (event: any) => void) {
    this.listeners.set(type, listener);
  }

  close = vi.fn();

  triggerMessage(data: Partial<CrawlResult> | string) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  triggerEnd() {
    const listener = this.listeners.get("end");
    listener?.({});
  }

  triggerEvent(type: string, data: any) {
    const listener = this.listeners.get(type);
    listener?.({ data: data });
  }

  triggerError(data: { error: string }) {
    const listener = this.listeners.get("error");
    listener?.({ data: JSON.stringify(data) });
  }
}

describe("crawl", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource as any);
    MockEventSource.last = null;
  });

  it("Should create an EventSource with the correct URL", async () => {
    const onResult = vi.fn();
    const onEnd = vi.fn();

    const promise = crawl("https://example.com", onResult, onEnd);
    const source = MockEventSource.last;

    expect(source).not.toBeNull();
    expect(source?.url).toBe("/crawl?url=https%3A%2F%2Fexample.com");

    source?.triggerEnd();
    await promise;
  });

  it("Should parse event messages and call onResult when streaming and onEnd after completion", async () => {
    const results: CrawlResult[] = [];
    const onEnd = vi.fn();

    const promise = crawl(
      "https://example.com",
      (result) => {
        results.push(result);
      },
      onEnd,
    );

    const source = MockEventSource.last;
    expect(source).not.toBeNull();
    source?.triggerMessage({ url: "https://example.com/", links: [] });
    source?.triggerMessage({ url: "https://example.com/a", links: [] });
    source?.triggerEnd();

    await expect(promise).resolves.toBeUndefined();
    expect(results).toEqual([
      { url: "https://example.com/", links: [] },
      { url: "https://example.com/a", links: [] },
    ]);
    expect(onEnd).toHaveBeenCalled();
  });

  it("Should handle error event by rejecting the promise", async () => {
    const onResult = vi.fn();
    const onEnd = vi.fn();

    const promise = crawl("https://example.com", onResult, onEnd);

    const source = MockEventSource.last;
    expect(source).not.toBeNull();
    source?.triggerEvent(
      "crawl-error",
      JSON.stringify({ error: "Streaming results failed" }),
    );

    await expect(promise).rejects.toThrow("Streaming results failed");
    expect(onResult).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(source?.close).toHaveBeenCalled();
  });
});
