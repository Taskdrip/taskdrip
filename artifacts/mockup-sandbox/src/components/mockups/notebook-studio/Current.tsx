import { useEffect } from "react";
import AdminNotebookStudio from "../../../../../../client/src/components/admin-notebook-studio";
import { DEFAULT_NOTEBOOK_COVER, DEFAULT_NOTEBOOK_SETTINGS } from "@shared/notebook-studio";

const apiPath = "/api/admin/creator-studio/notebooks";
const previewProject = {
  id: "mockup-notebook-journal",
  title: "Notebook journal",
  status: "needs-review",
  updatedAt: "2026-10-13T09:00:00.000Z",
  settings: {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 160,
    use2027PlannerPdf: true,
    trimSize: "8.27x11.69",
    diaryStartMonth: "2027-01",
    lineSpacing: 0.28,
  },
  coverDesign: {
    ...DEFAULT_NOTEBOOK_COVER,
    style: "minimal",
    description: "A calm, minimal yearly notebook cover.",
    background: "#fbf8ef",
    accent: "#253c87",
  },
};

const previewWindow = window as Window & { __notebookStudioPreviewApi?: boolean };

if (!previewWindow.__notebookStudioPreviewApi) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (!requestUrl.pathname.startsWith(apiPath)) {
      return nativeFetch(input, init);
    }

    const method = (init?.method || "GET").toUpperCase();
    const projectRoute = requestUrl.pathname.slice(apiPath.length).replace(/^\/+/, "");
    const respond = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    if (!projectRoute) {
      if (method === "GET") return respond([previewProject]);
      if (method === "POST") return respond(previewProject, 201);
    }
    if (projectRoute === previewProject.id) {
      if (method === "GET") return respond(previewProject);
      if (method === "PUT" || method === "PATCH") {
        let updated = previewProject;
        try {
          const body = JSON.parse(String(init?.body || "{}"));
          updated = {
            ...previewProject,
            ...body,
            settings: { ...previewProject.settings, ...(body.settings || {}) },
            coverDesign: { ...previewProject.coverDesign, ...(body.coverDesign || {}) },
          };
        } catch {
          // Keep the sample project intact when a preview-only request has no JSON body.
        }
        return respond(updated);
      }
    }
    if (projectRoute.endsWith("/validate")) {
      return respond({
        validation: { summary: "Preview checks are ready to run against the saved project.", items: [] },
      });
    }
    if (projectRoute.endsWith("/generate")) {
      return respond({
        project: previewProject,
        validation: { summary: "Preview files are generated in the sample workspace.", items: [] },
      });
    }
    return respond({ message: "This action is disabled in the isolated design preview." }, 501);
  }) as typeof window.fetch;
  previewWindow.__notebookStudioPreviewApi = true;
}

export default function Current() {
  useEffect(() => {
    document.documentElement.classList.add("notebook-studio-preview");
    return () => document.documentElement.classList.remove("notebook-studio-preview");
  }, []);

  return <AdminNotebookStudio onExit={() => undefined} />;
}
