import "./CrawlerOutput.css";

export type CrawlResult = {
  url: string;
  links: string[];
};

const CrawlerOutput = ({ results = [] }: { results?: CrawlResult[] }) => {
  return (
    <div id="crawler-results-list" data-testid="crawler-results-list">
      {results.map((result) => (
        <div key={result.url} className="crawler-result">
          <p className="crawler-result-visited">Visited:</p>
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="truncate crawler-result-visited-link"
            title={result.url}
          >
            {result.url}
          </a>

          {result.links.length > 0 && (
            <>
              <p className="crawler-result-found">Found:</p>
              <div className="crawler-result-links-list crawler-result-found-links">
                {result.links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate"
                    title={link}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default CrawlerOutput;
