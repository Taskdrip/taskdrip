import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export default function NotebookPlannerPagePreview({
  src,
  label,
}: {
  src: string;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let documentProxy: PDFDocumentProxy | null = null;
    let pageProxy: PDFPageProxy | null = null;
    let renderTask: RenderTask | null = null;
    setError("");
    setIsLoading(true);

    const renderPage = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!pageProxy || !container || !canvas || !context || cancelled) return;

      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;

      renderTask?.cancel();
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const baseViewport = pageProxy.getViewport({ scale: 1 });
      const scale = Math.min(width / baseViewport.width, height / baseViewport.height) * pixelRatio;
      const viewport = pageProxy.getViewport({ scale });

      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const offsetX = (canvas.width - viewport.width) / 2;
      const offsetY = (canvas.height - viewport.height) / 2;
      const nextRender = pageProxy.render({
        canvasContext: context,
        viewport,
        transform: [1, 0, 0, 1, offsetX, offsetY],
        background: "#ffffff",
      });
      renderTask = nextRender;
      void nextRender.promise
        .then(() => {
          if (!cancelled) setIsLoading(false);
        })
        .catch((renderError: unknown) => {
          if (
            !cancelled
            && !(renderError instanceof Error && renderError.name === "RenderingCancelledException")
          ) {
            setError("This planner page could not be rendered.");
            setIsLoading(false);
          }
        });
    };

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(renderPage);

    const loadPage = async () => {
      try {
        const response = await fetch(src, { credentials: "same-origin" });
        if (!response.ok) {
          throw new Error(`Planner page request failed (${response.status}).`);
        }
        const pdfData = new Uint8Array(await response.arrayBuffer());
        if (cancelled) return;

        const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        documentProxy = await getDocument({ data: pdfData }).promise;
        if (cancelled) {
          void documentProxy.destroy();
          return;
        }
        pageProxy = await documentProxy.getPage(1);
        if (cancelled) return;

        const container = containerRef.current;
        if (container) resizeObserver?.observe(container);
        renderPage();
      } catch {
        if (!cancelled) {
          setError("This planner page could not be loaded.");
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      renderTask?.cancel();
      if (documentProxy) void documentProxy.destroy();
    };
  }, [src]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-white" aria-busy={isLoading}>
      <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={label} />
      {error && (
        <div role="status" className="absolute inset-0 grid place-items-center bg-white px-3 text-center text-[10px] text-[#8c4736]">
          {error}
        </div>
      )}
    </div>
  );
}
