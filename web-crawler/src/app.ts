import express, { Request, Response } from "express";
import checkHost from "./utils/checkHost.js";
import fetchUrl from "./utils/fetchUrl.js";
import extractLinks from "./utils/extractLinks.js";
import { crawl, CrawlResult } from "./crawl.js";
import { validateUrl } from "./utils/url.js";

export const app = express();

app.get("/crawl", async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!url) {
    res.write(
      `event: crawl-error\ndata: ${JSON.stringify({ error: "Missing URL" })}\n\n`,
    );
    return res.end();
  }

  const validUrl = validateUrl(url);

  if (!validUrl) {
    res.write(
      `event: crawl-error\ndata: ${JSON.stringify({ error: "Invalid URL" })}\n\n`,
    );
    return res.end();
  }

  const startUrl = validUrl.toString();
  const validDomain = checkHost(startUrl);

  let total = 0;

  let closed = false;

  req.on("close", () => {
    closed = true;
  });

  try {
    await crawl(
      startUrl,
      {
        fetchUrl,
        extractLinks,
        validDomain,
        onPage: (result: CrawlResult) => {
          if (closed) return;
          total++;
          res.write(`data: ${JSON.stringify(result)}\n\n`);
        },
        onError: (url: string, error: unknown) => {
          if (closed) return;

          console.warn(`Failed to crawl ${url}`, error);
        },
      },
      { concurrency: 10, isCancelled: () => closed },
    );

    if (!closed) {
      res.write(`event: end\ndata: ${JSON.stringify({ total: total })}\n\n`);
      res.end();
    }
  } catch (error: unknown) {
    if (!closed) {
      res.write(
        `event: crawl-error\ndata: ${JSON.stringify({ error: (error as Error).message ?? "Failed to crawl" })}\n\n`,
      );
      res.end();
    }
  }
});
