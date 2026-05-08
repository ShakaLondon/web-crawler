import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import * as crawlModule from "./utils/api";
import type { CrawlResult } from "./components/CrawlerOutput/CrawlerOutput";

vi.mock("./utils/api");

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Renders the app header and no results initially", () => {
    render(<App />);

    expect(screen.getByText("Web Crawler")).toBeInTheDocument();
    expect(screen.getByText("No results to display")).toBeInTheDocument();
  });

  it("Renders crawling when there are no results and crawling has started", async () => {
    const mockCrawl = vi.mocked(crawlModule.crawl);

    mockCrawl.mockImplementation(
      async (
        _url: string,
        _onResult: (result: CrawlResult) => void,
        onEnd: () => void,
      ) => {
        onEnd();
      },
    );

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText("Enter URL to crawl"), {
      target: { value: "https://example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crawl/i }));

    await waitFor(() => {
      expect(screen.queryByText("Crawling...")).not.toBeInTheDocument();
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  it("Displays correct number of results", async () => {
    const mockCrawl = vi.mocked(crawlModule.crawl);

    mockCrawl.mockImplementation(
      async (
        _url: string,
        onResult: (result: CrawlResult) => void,
        onEnd: () => void,
      ) => {
        onResult({ url: "https://example.com/", links: [] });
        onResult({ url: "https://example.com/a", links: [] });
        onEnd();
      },
    );

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText("Enter URL to crawl"), {
      target: { value: "https://example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crawl/i }));

    expect(await screen.findByText("2 Results:")).toBeInTheDocument();
  });

  it("Displays crawl results after starting crawling", async () => {
    const mockCrawl = vi.mocked(crawlModule.crawl);

    mockCrawl.mockImplementation(
      async (
        _url: string,
        onResult: (result: CrawlResult) => void,
        onEnd: () => void,
      ) => {
        onResult({ url: "https://example.com/", links: [] });
        onResult({ url: "https://example.com/a", links: [] });
        onEnd();
      },
    );

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText("Enter URL to crawl"), {
      target: { value: "https://example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crawl/i }));

    expect(await screen.findByText("https://example.com/")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/a")).toBeInTheDocument();
  });

  it("Displays error message when crawl fails", async () => {
    const mockCrawl = vi.mocked(crawlModule.crawl);

    mockCrawl.mockImplementation(
      async (
        _url: string,
        _onResult: (result: CrawlResult) => void,
        _onEnd: () => void,
      ) => {
        throw new Error("Failed to crawl");
      },
    );

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText("Enter URL to crawl"), {
      target: { value: "https://example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crawl/i }));

    expect(await screen.findByText("Failed to crawl")).toBeInTheDocument();
  });
});
