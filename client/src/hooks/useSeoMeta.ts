import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface SeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  keywords?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

function setMeta(name: string, content: string, useProperty = false) {
  if (!content) return;
  const selector = useProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement;
  if (!el) {
    el = document.createElement("meta");
    if (useProperty) el.setAttribute("property", name);
    else el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

function setRobots(noIndex: boolean, noFollow: boolean) {
  const value = [noIndex ? "noindex" : "index", noFollow ? "nofollow" : "follow"].join(", ");
  setMeta("robots", value);
}

export function usePageSeo(pageSlug: string, fallback?: Partial<SeoMeta>) {
  const { data: pwaSettings } = useQuery<any>({
    queryKey: ["/api/pwa-settings"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: seoData } = useQuery<any>({
    queryKey: [`/api/seo/page/${pageSlug}`],
    staleTime: 5 * 60 * 1000,
    enabled: !!pageSlug,
  });

  useEffect(() => {
    const seo: SeoMeta = { ...fallback, ...seoData };
    const defaultOgImage = pwaSettings?.defaultOgImage || "";
    const siteName = pwaSettings?.appName || "Taskdrip";

    if (seo.metaTitle) document.title = seo.metaTitle;
    else if (fallback?.metaTitle) document.title = fallback.metaTitle;

    setMeta("description", seo.metaDescription || fallback?.metaDescription || "");
    setMeta("keywords", seo.keywords || fallback?.keywords || "");

    const robots = seo.noIndex || seo.noFollow;
    if (robots) setRobots(!!seo.noIndex, !!seo.noFollow);

    setMeta("og:title", seo.ogTitle || seo.metaTitle || fallback?.metaTitle || document.title, true);
    setMeta("og:description", seo.ogDescription || seo.metaDescription || fallback?.metaDescription || "", true);
    setMeta("og:image", seo.ogImage || defaultOgImage, true);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", siteName, true);

    const tCard = seo.twitterCard || "summary_large_image";
    setMeta("twitter:card", tCard);
    setMeta("twitter:title", seo.twitterTitle || seo.ogTitle || seo.metaTitle || "");
    setMeta("twitter:description", seo.twitterDescription || seo.ogDescription || seo.metaDescription || "");
    setMeta("twitter:image", seo.twitterImage || seo.ogImage || defaultOgImage);
    setMeta("twitter:site", "@taskdrip");

    if (seo.canonicalUrl) setCanonical(seo.canonicalUrl);

    const gVerify = pwaSettings?.googleSiteVerification;
    if (gVerify) setMeta("google-site-verification", gVerify);

    const bVerify = pwaSettings?.bingVerification;
    if (bVerify) setMeta("msvalidate.01", bVerify);
  }, [seoData, pwaSettings, pageSlug, fallback]);
}

export function injectAnalytics(gaId: string, gtmId?: string) {
  if (gaId && !document.getElementById("ga4-script")) {
    const script1 = document.createElement("script");
    script1.id = "ga4-script";
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.id = "ga4-init";
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { page_path: window.location.pathname });
    `;
    document.head.appendChild(script2);
  }

  if (gtmId && !document.getElementById("gtm-script")) {
    const script = document.createElement("script");
    script.id = "gtm-script";
    script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
    document.head.appendChild(script);
  }
}

export function trackPageView(path: string, gaId: string) {
  if (!(window as any).gtag || !gaId) return;
  (window as any).gtag("config", gaId, { page_path: path });
}
