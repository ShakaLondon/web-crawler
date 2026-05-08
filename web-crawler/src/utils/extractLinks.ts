import { load } from "cheerio";

const extractLinks = (link: string, html: string): string[] => {
  const $ = load(html);
  const links = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) return;

    try {
      const url = new URL(href, link);

      url.hash = "";

      if (url.protocol === "http:" || url.protocol === "https:") {
        links.add(url.toString());
      }
    } catch {
      throw new Error(`Unable to access URL found in ${link}: ${href}`);
    }
  });

  return Array.from(links);
};

export default extractLinks;
