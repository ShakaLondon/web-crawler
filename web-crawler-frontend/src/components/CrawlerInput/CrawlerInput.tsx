import { useState, type SubmitEvent, type ChangeEvent } from "react";
import "./CrawlerInput.css";
import { crawl } from "../../utils/api";
import type { CrawlResult } from "../CrawlerOutput/CrawlerOutput";

const CrawlerInput = ({
  setResults,
  setStreamOn,
  addResult,
  endStream,
}: {
  setResults: (results: CrawlResult[]) => void;
  setStreamOn: (streamOn: boolean) => void;
  addResult: (result: CrawlResult) => void;
  endStream: () => void;
}) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setResults([]);
    setStreamOn(true);

    if (!url) {
      setError("Please enter a URL to crawl.");
      setStreamOn(false);
      return;
    }

    try {
      await crawl(url, addResult, endStream);
    } catch (err) {
      setError(
        (err as Error).message || "An error occurred while crawling the URL.",
      );
      setStreamOn(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  return (
    <form
      id="crawler-search"
      data-testid="crawler-search"
      onSubmit={handleSubmit}
    >
      <div id="crawler-search-input" data-testid="crawler-search-input">
        <input
          type="text"
          placeholder="Enter URL to crawl"
          onChange={handleChange}
        />
        <button>Crawl</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
};

export default CrawlerInput;
