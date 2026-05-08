import { normaliseUrl } from "./utils/url.js";

export type CrawlResult = {
  url: string;
  links: string[];
};

export type CrawlFunctions = {
  fetchUrl: (url: string) => Promise<string>;
  extractLinks: (baseUrl: string, html: string) => string[];
  validDomain: (url: string) => boolean;
  onPage?: (result: CrawlResult) => void;
  onError?: (url: string, error: unknown) => void;
};

type CrawlOptions = {
  concurrency?: number;
  maxPages?: number;
  maxTime?: number;
  isCancelled?: () => boolean;
};

export async function crawl(
  startUrl: string,
  helpers: CrawlFunctions,
  options: CrawlOptions = {},
): Promise<CrawlResult[]> {
  const concurrency = Math.max(1, options.concurrency ?? 5);
  const maxPages = Math.max(1, options.maxPages ?? Infinity);
  const maxTime = Math.max(0, options.maxTime ?? Infinity);
  const startTime = Date.now();

  const normalisedStartUrl = normaliseUrl(startUrl);

  if (!normalisedStartUrl) {
    throw new Error(`Invalid start URL: ${startUrl}`);
  }

  if (!helpers.validDomain(normalisedStartUrl)) {
    throw new Error(`Start URL is outside the valid domain: ${startUrl}`);
  }

  const queue: string[] = [normalisedStartUrl];
  const queued = new Set<string>([normalisedStartUrl]);
  const visited = new Set<string>();
  const results: CrawlResult[] = [];

  const isTimedOut = (): boolean => Date.now() - startTime >= maxTime;
  const hasCapacity = (): boolean => results.length < maxPages;

  const shouldContinue = (): boolean => {
    return (
      !options.isCancelled?.() &&
      queue.length > 0 &&
      hasCapacity() &&
      !isTimedOut()
    );
  };

  const crawlOnce = async (url: string): Promise<void> => {
    if (visited.has(url)) return;
    if (!hasCapacity()) return;
    if (isTimedOut()) return;

    visited.add(url);

    try {
      const html = await helpers.fetchUrl(url);
      const rawLinks = helpers.extractLinks(url, html);

      const links = Array.from(
        new Set(
          rawLinks.map(normaliseUrl).filter((link): link is string => {
            return link !== null && helpers.validDomain(link);
          }),
        ),
      );

      for (const link of links) {
        if (visited.has(link)) continue;
        if (queued.has(link)) continue;

        queued.add(link);
        queue.push(link);
      }

      const result: CrawlResult = {
        url,
        links,
      };

      results.push(result);
      helpers.onPage?.(result);
    } catch (error) {
      helpers.onError?.(url, error);
    }
  };

  while (shouldContinue()) {
    const batch = queue.splice(0, concurrency);

    await Promise.all(batch.map((url) => crawlOnce(url)));
  }

  return results;
}
