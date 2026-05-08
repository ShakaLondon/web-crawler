# 🕸️ Web Crawler

A simple web crawler built in TypeScript that traverses a domain, visits pages and streams results in real time.

### 📌 Overview

The crawler in this application:

- Starts from a given URL
- Crawls all the pages within the same domain
- Extracts all links from each page
- Streams results as they are discovered via Server-Sent Events (SSE)
- Dedupes results to make sure that each page is only visited once
- Handles errors and cancellations gracefully

Each result represents a visited page:

```
type CrawlResult = {
  url: string;     <-- The URL visited
  links: string[];     <-- All the URLs found on the page visited
};
```

### 🏗️ Project Structure

```
web-crawler/
├── src/
│   ├── server.ts                        # Application entry point
│   ├── crawl.ts                         # Core crawling logic
│   │   crawl.test.ts
│   ├── app.ts                           # Express server (SSE endpoint)
│   │   app.test.ts
│   └── utils/
│       ├── fetchUrl.ts                  # URL fetch with timeout and validation
│       │   fetchUrl.test.ts
│       ├── extractLinks.ts              # HTML parsing using cheerio
│       │   extractLinks.test.ts
│       ├── checkHost.ts                 # Domain checker
│       │   checkHost.test.ts
│       ├── url.ts                       # URL validation + normalisation
│       │   url.test.ts
│
│
web-crawler-frontend/
├── src/
│   ├── main.tsx                         # UI Entrypoint
│   │   main.css
│   ├── App.tsx                          # Main Component
│   │   App.test.ts
│   │   App.css
│   ├── components/
│   │   ├── CrawlerInput/
│   │   │   ├── CrawlerInput.tsx.        # Crawler Input component
│   │   │   │   CrawlerInput.test.ts
│   │   │   │   CrawlerInput.css
│   │   ├── CrawlerOutput/
│   │   │   ├── CrawlerOutput.tsx.        # Crawler Ouput component
│   │   │   │   CrawlerOutput.test.ts
│   │   │   │   CrawlerOutput.css
│   └── utils/
│       ├── api.ts                        # SSE client
│       │   api.test.tsx
```

### 🚀 Getting Started

##### Install dependencies

From the root

```
npm run install:all
```

OR

From the individual repositories

```
npm install
npm install --prefix web-crawler
npm install --prefix web-crawler-frontend
```

##### Run the application

(Run both applications from the parent folder using concurrently - Both applications can also be run individually from their directories)

```
npm run dev
```

```
Backend → http://localhost:3000
Frontend → http://localhost:5173
```

##### Run tests

Watch mode:

```
npm test
```

One-off run:

```
npm run test:run
```

### 🌐 API

```
GET /crawl?url=<url>
```

Streams crawl results using Server-Sent Events (SSE).

##### Events

📄 Data (default)

```
data: { "url": "...", "links": [...] }
```

✅ End

```
event: end
data: { "total": number }
```

❌ Error

```
event: crawl-error
data: { "error": "message" }
```

### ⚙️ Core Design Decisions

##### Key features:

- URL validation --> URL Validation
- Link extraction --> Extract links from HTML
- Deduplication --> Remove duplicate links from Queue to stop cyclical transversal
- Domain filtering --> Only aloow for visint pages within the same domain
- Streaming --> Easier than passing 4000 seperate results
- Cancellation logic --> To stop the application from continuing when cancelled

##### 1. Streaming with SSE

Instead of returning all results at once, results are streamed as they are discovered.

Why: - Creates a better User Experience for long crawls - Avoids allowing requests to block results processing - Streaming scales better than returning a large payload all at once

##### 2. Separation of Concerns & Deduplication Strategy: Discovery vs Crawling

The crawler tracks:

visited → pages already fetched
queued → pages scheduled to be fetched

```
    const links = [...]
```

Gather all the links which are found from the HTML retrieved from the link

```
    const queue: string[]
```

Creates a list of what needs to be processed next

```
    const queued = new Set<string>()
```

Queued represents a fast-lookup to make sure that a link is not added for crawling twice

```
    for (const link of links) {
        if (visited.has(link)) continue;
        if (queued.has(link)) continue;

        queued.add(link);
        queue.push(link);
    }
```

Only enqueue new links and ignore duplicates

Why: - Prevents duplicate crawling - Enables the application to always return the full list of links for each page without crawling a link more than once - Prevents Infinite loops when deciding which links to crawl

##### 3. URL Normalisation

All URLs are normalised before processing: - Converted to lowercase - Hash fragments are removed - Trailing slashes removed (except root)

Why: - Prevents duplicates like:
/about
/about/
/about#section

##### 4. Domain Restriction

Only URLs matching the starting domain are crawled.

```
    helpers.validDomain(url)
```

Checks that only URLs within the domain are added to the queue

Why: - Required by the task and prevents crawling external sites

##### 5. Concurrency

The crawler processes multiple pages in parallel:

```
    { concurrency: number }
```

Why: - Improves performance significantly - Avoids slow sequential crawling - Concurrency is intentionally not exposed in the UI to keep it simple, however this would be a future improvement

##### 6. Cancellation

The crawler stops when the client disconnects:

```
    req.on("close", () => {
    closed = true;
    });
```

This signal is passed into the crawler:

```
    isCancelled: () => closed
```

Why: - Prevents orphaned background work crashing the page - Avoids memory / CPU leaks

##### 7. Error Handling

Page-level errors (e.g. timeouts) are logged and skippeds the crawl continues even if some pages fail
Errors are propogated under 'crawl-error' so that the messages can be processed in the frontend

Why: - A single broken page should not fail the entire crawl.

### ⚠️ Trade-offs

##### 1. In-memory state

All crawl state is stored in memory - Not suitable for very large crawls

##### 2. No robots.txt support

The crawler does not respect robots.txt - Not necessary for this excercise, but would be a useful future improvement

##### 3. No rate limiting

Only concurrency, pages and time can be controlled due to time constraints but this would be a useful future feature

##### 4. Non-deterministic ordering

Due to concurrency, crawl order may vary slightly

##### 5. Streaming vs aggregation

The backend streams results and only tracks a total count instead of storing all results - Keeps memory usage low - More production-friendly

### 🔧 Future Improvements

#### 1. robots.txt support

A production crawler should check a site’s `robots.txt` file before crawling

`robots.txt` allows website owners to describe which paths crawlers should avoid

**Why this would be useful:**

- Respects website crawling rules
- Avoids crawling private areas that are not intended for crawlers
- Makes the crawler behave more politely
- Reduces the chance of putting unnecessary load on a site

This was not included because the task focused on the core crawling behaviour

#### 2. Rate limiting / delays

The current crawler limits concurrency, but it does not add a delay between requests.

Rate limiting would control how frequently requests are made to the same domain

**Why this would be useful:**

- Prevents overwhelming the target website
- Reduces the chance of being blocked
- Makes behaviour safer for larger crawls
- Gives more control than concurrency alone

For example, even with `concurrency: 10` a crawler could still send many requests very quickly. A crawler should combine concurrency limits with rate limiting

#### 3. Retry logic with backoff

Some requests fail temporarily due to network issues or slow responses

**Why this would be useful:**

- Makes crawling more reliable
- Handles transient failures gracefully
- Avoids failing pages due to one temporary timeout

Retrying failed requests a small number of times with increasing delays

#### 4. Persistent crawl state

The current implementation stores crawl state in memory

**Why this would be useful:**

- Allows large crawls without losing state
- Enables resuming a crawl after a restart
- Makes the crawler more suitable for larger crawls

This could be done with Redis, a database, or a queue system.

#### 5. Configurable crawl limits

The crawler already supports options such as concurrency, maximum pages and maximum time, but the UI keeps these fixed, I would allow users to edit these options in the UI

**Why this would be useful:**

- Gives users more control over crawl size and speed
- Allows safer limits for large websites
- Makes testing different crawl behaviours easier

This was not exposed in the UI to keep the task focused and the interface simple.

#### 6. Better observability

More structured logs and metrics.

**Why this would be useful:**

- Easier debugging
- Visibility into failed pages, request timings and crawl progress
- Helps identify slow pages or performance bottlenecks

Useful metrics might include pages crawled, pages skipped, errors, average fetch time and queue size.
