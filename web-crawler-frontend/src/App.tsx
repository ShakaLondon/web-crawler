import { useState } from "react";
import "./App.css";
import CrawlerInput from "./components/CrawlerInput/CrawlerInput";
import CrawlerOutput, {
  type CrawlResult,
} from "./components/CrawlerOutput/CrawlerOutput";

function App() {
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [streamOn, setStreamOn] = useState(false);

  const addResult = (result: CrawlResult) => {
    setResults((prev) => [...prev, result]);
  };

  const endStream = () => {
    setStreamOn(false);
  };

  return (
    <div id="App" data-testid="App">
      <p className="h1 full-width">Web Crawler</p>
      <CrawlerInput
        setResults={setResults}
        setStreamOn={setStreamOn}
        addResult={addResult}
        endStream={endStream}
      />
      <div
        id="crawler-output"
        data-testid="crawler-output"
        className="full-width"
      >
        <div id="crawler-output-header" data-testid="crawler-output-header">
          {results.length} Results:
        </div>
        {!streamOn && results.length === 0 && <p>No results to display</p>}
        {results.length > 0 && <CrawlerOutput results={results} />}
        {streamOn && results.length === 0 && <p>Crawling...</p>}
      </div>
    </div>
  );
}

export default App;
