import { useEffect, useRef, useState } from "react";

type SandboxedAdFrameProps = {
  id: string;
  title: string;
  html: string;
  initialHeight: number;
  className?: string;
  onUnavailable?: () => void;
};

function buildAdDocument(id: string, html: string, initialHeight: number) {
  const safeId = JSON.stringify(id).replace(/</g, "\\u003c");
  const minHeight = Math.max(80, Math.min(1200, Math.round(initialHeight)));
  const monitor = `<script>(function(){var id=${safeId},root=document.getElementById("taskdrip-ad-root");function report(){if(!root)return;var anchors=Array.prototype.some.call(root.querySelectorAll("a,button,[role=button]"),function(el){return el.getClientRects().length>0&&(el.textContent.trim()||el.querySelector("img"))});var ready=!!root.querySelector("iframe,img,video,canvas,ins,object,embed")||anchors;var height=Math.ceil(Math.max(root.scrollHeight,document.body.scrollHeight,document.documentElement.scrollHeight));parent.postMessage({type:"taskdrip-ad-frame",id:id,ready:ready,height:height},"*")}var observer=new MutationObserver(report);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src","style","class"]});if(window.ResizeObserver){new ResizeObserver(report).observe(root)}report()})()</script>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;width:100%;min-height:${minHeight}px;background:transparent;overflow:hidden}#taskdrip-ad-root{box-sizing:border-box;width:100%;min-height:${minHeight}px;max-width:100%;overflow:hidden}#taskdrip-ad-root img,#taskdrip-ad-root iframe{max-width:100%}</style></head><body><div id="taskdrip-ad-root">${html}</div>${monitor}</body></html>`;
}

export function SandboxedAdFrame({
  id,
  title,
  html,
  initialHeight,
  className,
  onUnavailable,
}: SandboxedAdFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [height, setHeight] = useState(initialHeight);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    readyRef.current = false;
    setReady(false);
    setExpired(false);
    const timeout = window.setTimeout(() => {
      if (!readyRef.current) {
        setExpired(true);
        onUnavailable?.();
      }
    }, 20_000);

    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== frameRef.current?.contentWindow ||
        event.data?.type !== "taskdrip-ad-frame" ||
        event.data?.id !== id
      ) return;

      const measuredHeight = Number(event.data.height);
      if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
        const nextHeight = Math.min(1200, Math.max(80, Math.ceil(measuredHeight)));
        setHeight((current) => current === nextHeight ? current : nextHeight);
      }
      if (event.data.ready === true) {
        readyRef.current = true;
        setReady(true);
        setExpired(false);
        window.clearTimeout(timeout);
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [id, html, initialHeight, onUnavailable]);

  if (expired) return null;

  return (
    <div className={`relative w-full ${className || ""}`}>
      {!ready && (
        <div
          aria-label="Advertisement loading"
          className="flex w-full items-center justify-center rounded bg-gray-100/70 text-xs text-gray-500"
          style={{ minHeight: Math.min(1200, Math.max(80, initialHeight)) }}
        >
          Advertisement
        </div>
      )}
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={buildAdDocument(id, html, initialHeight)}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        aria-hidden={!ready}
        tabIndex={ready ? 0 : -1}
        className={`absolute inset-0 w-full border-0 ${ready ? "" : "pointer-events-none opacity-0"}`}
        style={{ height, maxWidth: "100%" }}
      />
    </div>
  );
}
