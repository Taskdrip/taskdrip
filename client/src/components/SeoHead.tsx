import { useEffect } from "react";

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
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

function setJsonLd(data?: object) {
  let el = document.querySelector('script[data-seo-page-ld]') as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-page-ld", "true");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function SeoHead({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
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
      setMeta("twitter:description", description);
    }
    if (keywords) setMeta("keywords", keywords);
    if (title) {
      setMeta("og:title", ogTitle || title, "property");
      setMeta("twitter:title", title);
    }
    if (ogDescription) setMeta("og:description", ogDescription, "property");
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("twitter:image", ogImage);
    }
    setMeta("og:type", ogType, "property");
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    const canonical = canonicalUrl || `${window.location.origin}${window.location.pathname}`;
    setCanonical(canonical);
    setMeta("og:url", canonical, "property");
    setJsonLd(jsonLd);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");

    return () => {
      if (title) document.title = prev;
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogType, canonicalUrl, jsonLd, noIndex]);

  return null;
}
