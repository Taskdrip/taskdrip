---
name: Search engine indexing limits
description: Distinguishes crawler discovery/submission from a search engine's actual indexing decision.
---

A sitemap advertises canonical URLs for discovery, while IndexNow notifies participating search engines of URL changes. Neither protocol guarantees indexing. Google does not accept generic direct URL indexing requests; direct Google Search Console operations require an authorized Search Console integration.

**Why:** Admin tools must not claim that a crawl or submission forces Google to index a URL.

**How to apply:** Show crawl and submission results as discovery signals, keep Google sitemap reporting separate from IndexNow, and explain that Google determines whether a page is indexed.
