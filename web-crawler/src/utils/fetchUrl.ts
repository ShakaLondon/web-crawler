const fetchUrl = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "web-crawler/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      throw new Error(`URL ${url} did not return HTML content`);
    }

    return await response.text();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out`);
    } else if (err instanceof Error) {
      throw new Error(`Error fetching ${url}: ${err.message}`);
    } else {
      throw new Error(`Unknown error fetching ${url}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

export default fetchUrl;
