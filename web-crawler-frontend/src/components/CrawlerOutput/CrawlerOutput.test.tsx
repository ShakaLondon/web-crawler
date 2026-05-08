import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CrawlerOutput from "./CrawlerOutput";

describe("CrawlerOutput", () => {
  it("Renders no results when result list is empty", () => {
    render(<CrawlerOutput results={[]} />);

    const resultList = screen.getByTestId("crawler-results-list");
    expect(resultList).not.toBeNull();
    expect(resultList.querySelectorAll("a")).toHaveLength(0);
  });

  it("Renders each result as a link when results are provided", () => {
    const results = [
      {
        url: "https://example.com",
        links: ["https://example.com/a"],
      },
    ];

    render(<CrawlerOutput results={results} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe("https://example.com");
    expect(links[1].textContent).toBe("https://example.com/a");
  });
});
