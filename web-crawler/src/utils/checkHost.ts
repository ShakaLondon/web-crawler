const checkHost = (url: string) => {
  const validHosts = new URL(url).host;

  return (urlInput: string) => {
    try {
      const parsed: URL = new URL(urlInput);
      return (
        ["http:", "https:"].includes(parsed.protocol) &&
        parsed.host === validHosts
      );
    } catch {
      return false;
    }
  };
};

export default checkHost;
