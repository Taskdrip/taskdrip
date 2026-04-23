import { useEffect } from "react";

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  jsonLd?: object;
  noIndex?: boolean;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLd(data: object) {
  let el = document.querySelector('script[data-seo-ld]') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-ld", "true");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function SeoHead({
  title,
  description,
  keywords,
  ogImage,
  ogType = "website",
  canonicalUrl,
  jsonLd,
  noIndex,
}: SeoHeadProps) {
  useEffect(() => {
    const prev = document.title;
    if (title) document.title = title;

    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description, "property");
    }
    if (keywords) setMeta("keywords", keywords);
    if (title) {
      setMeta("og:title", title, "property");
      setMeta("twitter:title", title, "property");
    }
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("twitter:image", ogImage, "property");
    }
    setMeta("og:type", ogType, "property");
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary", "property");
    if (canonicalUrl) setCanonical(canonicalUrl);
    if (jsonLd) setJsonLd(jsonLd);
    if (noIndex) setMeta("robots", "noindex, nofollow");

    return () => {
      if (title) document.title = prev;
    };
  }, [title, description, keywords, ogImage, ogType, canonicalUrl, jsonLd, noIndex]);

  return null;
}
