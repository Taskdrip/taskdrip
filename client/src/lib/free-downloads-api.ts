import { useQuery } from "@tanstack/react-query";

const base = "/api/free-downloads";

export type FreeDownloadCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  sortOrder?: number;
  downloadCount: number;
  subcategories?: { id: string; name: string; slug: string; sortOrder: number }[];
};

export type FreeDownloadSummary = {
  id: string;
  downloadCode: string;
  title: string;
  slug: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  tags: string[];
  thumbnailUrl?: string | null;
  previewVideoUrl?: string | null;
  format: string;
  fileSizeBytes?: number | null;
  version?: string;
  creator?: string;
  releaseDate?: string | null;
  preacherId?: string | null;
  preacherName?: string | null;
  preacherSlug?: string | null;
  isFeatured: boolean;
  downloadCount: number;
  publishedAt?: string;
  isUnlocked?: boolean;
  seo?: {
    title: string;
    description: string;
    focusKeyword: string;
    canonicalUrl?: string | null;
    ogTitle: string;
    ogDescription: string;
    ogImage?: string | null;
  };
};

export type FreeDownloadDetail = FreeDownloadSummary & {
  descriptionHtml: string;
  galleryUrls: string[];
  previewVideoUrl?: string;
  externalDemoUrl?: string | null;
  systemRequirements: string;
  installationInstructions: string;
  features: string[];
  preacher?: {
    id: string;
    fullName: string;
    slug: string;
    photographUrl?: string | null;
    biography: string;
    ministryName: string;
  } | null;
  adRequired: boolean;
  smartlinkConfigured: boolean;
  telegramUrl: string;
  publicationStatus?: "draft" | "preview" | "published";
  adminPreview?: boolean;
  seo: {
    title: string;
    description: string;
    focusKeyword: string;
    canonicalUrl?: string | null;
    ogTitle: string;
    ogDescription: string;
    ogImage?: string | null;
  };
  related: FreeDownloadSummary[];
};

export type FreeDownloadPreview = FreeDownloadSummary & {
  descriptionHtml: string;
  features: string[];
  systemRequirements: string;
  installationInstructions: string;
  adRequired: boolean;
  smartlinkConfigured: boolean;
};

export type FreeDownloadFilters = {
  q?: string;
  category?: string;
  subcategory?: string;
  fileType?: "document" | "archive" | "audio" | "video" | "image" | "software";
  format?: string;
  preacher?: string;
  minSize?: number;
  maxSize?: number;
  from?: string;
  to?: string;
  featured?: boolean;
  sort?: "latest" | "popular" | "alphabetical" | "trending" | "oldest";
  page?: number;
  limit?: number;
};

export type FreeDownloadRequestInput = {
  resourceTitle: string;
  categoryName: string;
  description: string;
  preferredFormat?: string;
  referenceUrl?: string;
  additionalComments?: string;
  website?: string;
};

async function requestJson<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.message) message = payload.message;
    } catch {
      const text = await response.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function uploadFormWithProgress<T>(
  url: string,
  method: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onload = () => {
      let payload: any = null;
      try { payload = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload?.message || `Save failed (${xhr.status})`));
        return;
      }
      resolve(payload as T);
    };
    xhr.send(form);
  });
}

function queryString(input: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  return query.toString();
}

export const freeDownloadsApi = {
  home: () => requestJson<any>(`${base}/home`),
  categories: () => requestJson<FreeDownloadCategory[]>(`${base}/categories`),
  list: (filters: FreeDownloadFilters) =>
    requestJson<{ items: FreeDownloadSummary[]; total: number; page: number; limit: number; pageCount: number }>(
      `${base}?${queryString(filters as Record<string, unknown>)}`,
    ),
  suggestions: (q: string) =>
    requestJson<{ suggestions: { title: string; slug: string; downloadCode: string; categoryName: string }[] }>(
      `${base}/suggestions?${queryString({ q })}`,
    ),
  byCode: (code: string) =>
    requestJson<{ title: string; slug: string; downloadCode: string }>(
      `${base}/by-code/${encodeURIComponent(code)}`,
    ),
  preacherSuggestions: (q: string) =>
    requestJson<{ suggestions: { id: string; fullName: string; slug: string; photographUrl?: string; ministryName: string }[] }>(
      `${base}/preachers/suggestions?${queryString({ q })}`,
    ),
  preview: (slug: string) => requestJson<FreeDownloadPreview>(`${base}/preview/${encodeURIComponent(slug)}`),
  detail: (slug: string) => requestJson<FreeDownloadDetail>(`${base}/${encodeURIComponent(slug)}`),
  preacher: (slug: string) =>
    requestJson<{
      preacher: { id: string; fullName: string; slug: string; photographUrl?: string | null; biography: string; ministryName: string };
      sermons: FreeDownloadSummary[];
    }>(`${base}/preachers/${encodeURIComponent(slug)}`),
  unlockStatus: (slug: string) => requestJson<{ unlocked: boolean; adRequired: boolean; smartlinkConfigured: boolean }>(`${base}/${encodeURIComponent(slug)}/unlock-status`),
  startAd: (slug: string) => requestJson<{ alreadyUnlocked: boolean; redirectId?: string; redirectUrl?: string }>(`${base}/${encodeURIComponent(slug)}/ad-start`, "POST", { popupOpened: true }),
  submitRequest: (data: FreeDownloadRequestInput) => requestJson<any>(`${base}/requests`, "POST", data),
  myRequests: () => requestJson<any[]>(`${base}/my-requests`),
  adminDownloads: () => requestJson<any[]>(`${base}/admin/downloads`),
  adminCategories: () => requestJson<any[]>(`${base}/admin/categories`),
  adminPreachers: () => requestJson<any[]>(`${base}/admin/preachers`),
  adminSettings: () => requestJson<any>(`${base}/admin/settings`),
  adminSlides: () => requestJson<any[]>(`${base}/admin/slides`),
  adminRequests: (filters: Record<string, unknown> = {}) =>
    requestJson<any[]>(`${base}/admin/requests?${queryString(filters)}`),
  adminAnalytics: (range = "30d") =>
    requestJson<any>(`${base}/admin/analytics?${queryString({ range })}`),
  adminPreview: (slug: string) => requestJson<FreeDownloadDetail>(`${base}/admin/preview/${encodeURIComponent(slug)}`),
  saveDownload: async (data: Record<string, unknown>, file?: File | null, id?: string, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("payload", JSON.stringify(data));
    if (file) form.append("downloadFile", file);
    return uploadFormWithProgress(
      id ? `${base}/admin/downloads/${id}` : `${base}/admin/downloads`,
      id ? "PUT" : "POST",
      form,
      onProgress,
    );
  },
  uploadMedia: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    const response = await fetch(`${base}/admin/media`, { method: "POST", credentials: "include", body: form });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || "Image upload failed.");
    }
    return response.json() as Promise<{ url: string }>;
  },
  createCategory: (data: Record<string, unknown>) => requestJson<any>(`${base}/admin/categories`, "POST", data),
  updateCategory: (id: string, data: Record<string, unknown>) => requestJson<any>(`${base}/admin/categories/${id}`, "PUT", data),
  deleteCategory: (id: string) => requestJson<any>(`${base}/admin/categories/${id}`, "DELETE"),
  createSubcategory: (data: Record<string, unknown>) => requestJson<any>(`${base}/admin/subcategories`, "POST", data),
  updateSubcategory: (id: string, data: Record<string, unknown>) => requestJson<any>(`${base}/admin/subcategories/${id}`, "PUT", data),
  deleteSubcategory: (id: string) => requestJson<any>(`${base}/admin/subcategories/${id}`, "DELETE"),
  createPreacher: (data: Record<string, unknown>) => requestJson<any>(`${base}/admin/preachers`, "POST", data),
  updatePreacher: (id: string, data: Record<string, unknown>) => requestJson<any>(`${base}/admin/preachers/${id}`, "PUT", data),
  deletePreacher: (id: string) => requestJson<any>(`${base}/admin/preachers/${id}`, "DELETE"),
  saveSettings: (data: Record<string, unknown>) => requestJson<any>(`${base}/admin/settings`, "PUT", data),
  createSlide: (data: Record<string, unknown>) => requestJson<any>(`${base}/admin/slides`, "POST", data),
  updateSlide: (id: string, data: Record<string, unknown>) => requestJson<any>(`${base}/admin/slides/${id}`, "PUT", data),
  deleteSlide: (id: string) => requestJson<any>(`${base}/admin/slides/${id}`, "DELETE"),
  updateRequest: (id: string, data: Record<string, unknown>) => requestJson<any>(`${base}/admin/requests/${id}`, "PATCH", data),
  deleteDownload: (id: string) => requestJson<any>(`${base}/admin/downloads/${id}`, "DELETE"),
  duplicateDownload: (id: string) => requestJson<any>(`${base}/admin/downloads/${id}/duplicate`, "POST", {}),
};

export const useFreeDownloadHome = () =>
  useQuery({ queryKey: ["free-downloads", "home"], queryFn: freeDownloadsApi.home });

export const useFreeDownloadCategories = () =>
  useQuery({ queryKey: ["free-downloads", "categories"], queryFn: freeDownloadsApi.categories });

export const useFreeDownloadList = (filters: FreeDownloadFilters, enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "list", filters],
    queryFn: () => freeDownloadsApi.list(filters),
    enabled,
  });

export const useFreeDownloadSuggestions = (q: string, enabled = q.trim().length >= 2) =>
  useQuery({
    queryKey: ["free-downloads", "suggestions", q],
    queryFn: () => freeDownloadsApi.suggestions(q),
    enabled,
  });

export const useFreeDownloadPreacherSuggestions = (q: string, enabled = q.trim().length >= 2) =>
  useQuery({
    queryKey: ["free-downloads", "preacher-suggestions", q],
    queryFn: () => freeDownloadsApi.preacherSuggestions(q),
    enabled,
  });

export const useFreeDownloadPreview = (slug: string, enabled = !!slug) =>
  useQuery({
    queryKey: ["free-downloads", "preview", slug],
    queryFn: () => freeDownloadsApi.preview(slug),
    enabled,
  });

export const useFreeDownloadDetail = (slug: string, enabled = !!slug) =>
  useQuery({
    queryKey: ["free-downloads", "detail", slug],
    queryFn: () => freeDownloadsApi.detail(slug),
    enabled,
  });

export const useAdminFreeDownloadPreview = (slug: string, enabled = !!slug) =>
  useQuery({
    queryKey: ["free-downloads", "admin-preview", slug],
    queryFn: () => freeDownloadsApi.adminPreview(slug),
    enabled,
  });

export const useFreeDownloadPreacher = (slug: string, enabled = !!slug) =>
  useQuery({
    queryKey: ["free-downloads", "preacher", slug],
    queryFn: () => freeDownloadsApi.preacher(slug),
    enabled,
  });

export const useFreeDownloadUnlockStatus = (slug: string, enabled = !!slug) =>
  useQuery({
    queryKey: ["free-downloads", "unlock", slug],
    queryFn: () => freeDownloadsApi.unlockStatus(slug),
    enabled,
  });

export const useMyFreeDownloadRequests = (enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "my-requests"],
    queryFn: freeDownloadsApi.myRequests,
    enabled,
  });

export const useAdminFreeDownloads = (enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "downloads"],
    queryFn: freeDownloadsApi.adminDownloads,
    enabled,
  });

export const useAdminFreeDownloadCategories = (enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "categories"],
    queryFn: freeDownloadsApi.adminCategories,
    enabled,
  });

export const useAdminFreeDownloadPreachers = (enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "preachers"],
    queryFn: freeDownloadsApi.adminPreachers,
    enabled,
  });

export const useAdminFreeDownloadSettings = (enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "settings"],
    queryFn: freeDownloadsApi.adminSettings,
    enabled,
  });

export const useAdminFreeDownloadSlides = (enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "slides"],
    queryFn: freeDownloadsApi.adminSlides,
    enabled,
  });

export const useAdminFreeDownloadRequests = (filters: Record<string, unknown> = {}, enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "requests", filters],
    queryFn: () => freeDownloadsApi.adminRequests(filters),
    enabled,
  });

export const useAdminFreeDownloadAnalytics = (range = "30d", enabled = true) =>
  useQuery({
    queryKey: ["free-downloads", "admin", "analytics", range],
    queryFn: () => freeDownloadsApi.adminAnalytics(range),
    enabled,
  });
