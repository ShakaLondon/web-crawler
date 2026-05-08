const validateUrl = (input: string): URL | false => {
  try {
    const trimmed = input.trim();

    const url = new URL(trimmed);
    const checkHostFormat = (host: string) => {
      const hostArray = url.host.split(".");
      return !hostArray.includes("") && hostArray.length >= 2;
    };

    if (
      !url ||
      !url.host.includes(".") ||
      !checkHostFormat(url.host) ||
      !["http:", "https:"].includes(url.protocol)
    ) {
      return false;
    }

    return url;
  } catch {
    return false;
  }
};

const normaliseUrl = (rawUrl: string): string => {
  const url = new URL(rawUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
};

export { validateUrl, normaliseUrl };
