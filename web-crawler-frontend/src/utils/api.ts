import type { CrawlResult } from "../components/CrawlerOutput/CrawlerOutput";

let currentSource: EventSource | null = null;

const crawl = async (
  url: string,
  onResult: (result: CrawlResult) => void,
  onEnd: () => void,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (currentSource) {
      currentSource.close();
    }

    const eventSource = new EventSource(
      `/crawl?url=${encodeURIComponent(url)}`,
    );

    currentSource = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onResult(data);
    };

    eventSource.addEventListener("end", () => {
      eventSource.close();
      currentSource = null;
      onEnd();
      resolve();
    });

    eventSource.addEventListener("error", () => {
      eventSource.close();
      currentSource = null;
      reject(new Error("Connection error"));
    });

    eventSource.addEventListener("crawl-error", (event: any) => {
      const messageEvent = event as MessageEvent;
      const data = JSON.parse(messageEvent.data) as { error?: string };

      eventSource.close();
      currentSource = null;
      reject(new Error(data.error ?? "Unknown crawl error"));
    });

    eventSource.onerror = () => {
      eventSource.close();
      currentSource = null;
    };
  });
};

export { crawl };
