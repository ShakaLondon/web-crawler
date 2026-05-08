import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CrawlerInput from "./CrawlerInput";
import * as crawlModule from "../../utils/api";

vi.mock("../../utils/api", () => ({
  crawl: vi.fn(),
}));

describe("CrawlerInput", () => {
  const setResults = vi.fn();
  const setStreamOn = vi.fn();
  const addResult = vi.fn();
  const endStream = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Renders the URL input and crawl button", () => {
    render(
      <CrawlerInput
        setResults={setResults}
        setStreamOn={setStreamOn}
        addResult={addResult}
        endStream={endStream}
      />,
    );

    expect(screen.getByPlaceholderText("Enter URL to crawl")).not.toBeNull();
    expect(screen.getByRole("button", { name: /crawl/i })).not.toBeNull();
  });

  it("Submits the form and calls crawl with the entered URL", async () => {
    const mockCrawl = vi.mocked(crawlModule.crawl);
    mockCrawl.mockResolvedValue(undefined);

    render(
      <CrawlerInput
        setResults={setResults}
        setStreamOn={setStreamOn}
        addResult={addResult}
        endStream={endStream}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter URL to crawl"), {
      target: { value: "https://example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /crawl/i }));

    await waitFor(() => expect(mockCrawl).toHaveBeenCalled());

    expect(setResults).toHaveBeenCalledWith([]);
    expect(setStreamOn).toHaveBeenCalledWith(true);
    expect(mockCrawl).toHaveBeenCalledWith(
      "https://example.com",
      addResult,
      endStream,
    );
  });

  it("Shows an error message and turns stream off when crawl rejects", async () => {
    const mockCrawl = vi.mocked(crawlModule.crawl);
    mockCrawl.mockRejectedValue(new Error("Streaming failed"));

    render(
      <CrawlerInput
        setResults={setResults}
        setStreamOn={setStreamOn}
        addResult={addResult}
        endStream={endStream}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter URL to crawl"), {
      target: { value: "https://example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /crawl/i }));

    expect(await screen.findByText("Streaming failed")).not.toBeNull();
    expect(setStreamOn).toHaveBeenLastCalledWith(false);
  });
});
