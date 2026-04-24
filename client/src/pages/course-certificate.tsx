import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Award, Download, ArrowLeft, Sparkles, Trophy, Loader2, Share2 } from "lucide-react";

function fmtDate(d: any) {
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
  catch { return ""; }
}

function fillTemplate(tpl: string, vars: Record<string, string>) {
  let out = tpl || "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
  }
  return out;
}

// Build the certificate as a self-contained SVG string (so we can rasterize it cleanly)
function buildCertificateSvg(cert: any, tpl: any, course: any) {
  const W = 1600, H = 1131; // A4 landscape ~ 1.414 ratio
  const accent = tpl?.accentColor || "#7c3aed";
  const bg = tpl?.bgColor || "#fdfaf6";
  const inst = tpl?.institutionName || "BreedSkool Academy";
  const headline = tpl?.headlineText || "Certificate of Completion";
  const studentName = cert.studentName || "Student";
  const courseTitle = cert.courseTitle || course?.title || "Course";
  const date = fmtDate(cert.issuedAt);
  const instructor = cert.instructorName || "";
  const body = fillTemplate(tpl?.bodyTemplate || "", {
    studentName, courseTitle, date, instructorName: instructor,
  });
  const sigName = tpl?.signatoryName || "";
  const sigTitle = tpl?.signatoryTitle || "";
  const code = cert.certCode || "";
  const logo = tpl?.institutionLogoUrl || "";
  const sig = tpl?.signatureImageUrl || "";
  const seal = tpl?.sealImageUrl || "";
  const borderStyle = tpl?.borderStyle || "classic";

  const escape = (s: string) => String(s || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" }[c] || c));
  const wrap = (text: string, max: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > max) { lines.push(line); line = w; }
      else line = (line + " " + w).trim();
    }
    if (line) lines.push(line);
    return lines;
  };
  const bodyLines = wrap(body, 75).slice(0, 4);

  // Border decorations
  const ornate = borderStyle === "ornate";
  const modern = borderStyle === "modern";
  const corner = (cx: number, cy: number, mirror = false) => `
    <g transform="translate(${cx} ${cy}) ${mirror ? "scale(-1 1)" : ""}">
      <path d="M0 0 L70 0 M0 0 L0 70" stroke="${accent}" stroke-width="3" fill="none"/>
      <circle cx="14" cy="14" r="5" fill="${accent}"/>
    </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.6"/>
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="${accent}" fill-opacity="0.08"/>
    </pattern>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="${bg}"/>
  ${ornate ? `<rect width="${W}" height="${H}" fill="url(#dots)"/>` : ""}

  <!-- outer & inner borders -->
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${accent}" stroke-width="${modern ? 2 : 6}"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="${modern ? "0" : "4 6"}" stroke-opacity="0.6"/>

  <!-- corner flourishes (ornate only) -->
  ${ornate ? corner(80, 80) + corner(W - 80, 80, true) + corner(80, H - 80) + corner(W - 80, H - 80, true) : ""}

  <!-- top accent bar -->
  <rect x="60" y="60" width="${W - 120}" height="6" fill="url(#accentGrad)"/>

  <!-- logo -->
  ${logo ? `<image href="${escape(logo)}" x="${W / 2 - 70}" y="100" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>` : ""}

  <!-- institution -->
  <text x="${W / 2}" y="${logo ? 285 : 180}" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="${accent}" font-weight="700" letter-spacing="3">${escape(inst.toUpperCase())}</text>

  <!-- headline -->
  <text x="${W / 2}" y="${logo ? 380 : 280}" text-anchor="middle" font-family="Georgia, serif" font-size="68" fill="#1f2937" font-weight="700">${escape(headline)}</text>

  <!-- decorative line -->
  <line x1="${W / 2 - 120}" y1="${logo ? 410 : 310}" x2="${W / 2 + 120}" y2="${logo ? 410 : 310}" stroke="${accent}" stroke-width="2"/>

  <!-- presented to -->
  <text x="${W / 2}" y="${logo ? 470 : 380}" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#6b7280" font-style="italic">This certificate is proudly presented to</text>

  <!-- student name -->
  <text x="${W / 2}" y="${logo ? 570 : 480}" text-anchor="middle" font-family="'Brush Script MT', 'Lucida Handwriting', cursive" font-size="92" fill="${accent}" font-weight="700">${escape(studentName)}</text>

  <!-- underline -->
  <line x1="${W / 2 - 350}" y1="${logo ? 595 : 505}" x2="${W / 2 + 350}" y2="${logo ? 595 : 505}" stroke="${accent}" stroke-width="2" stroke-opacity="0.5"/>

  <!-- body -->
  ${bodyLines.map((line, i) => `<text x="${W / 2}" y="${(logo ? 655 : 565) + i * 38}" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#374151">${escape(line)}</text>`).join("\n  ")}

  <!-- bottom row: signature | seal | date+code -->
  <!-- Left: signature -->
  <g>
    ${sig ? `<image href="${escape(sig)}" x="${W * 0.18 - 100}" y="${H - 280}" width="200" height="80" preserveAspectRatio="xMidYMid meet"/>` : ""}
    <line x1="${W * 0.18 - 130}" y1="${H - 200}" x2="${W * 0.18 + 130}" y2="${H - 200}" stroke="#374151" stroke-width="2"/>
    <text x="${W * 0.18}" y="${H - 170}" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1f2937" font-weight="700">${escape(sigName)}</text>
    <text x="${W * 0.18}" y="${H - 140}" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#6b7280">${escape(sigTitle)}</text>
  </g>

  <!-- Center: seal -->
  ${seal
    ? `<image href="${escape(seal)}" x="${W / 2 - 70}" y="${H - 270}" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>`
    : `<g transform="translate(${W / 2} ${H - 200})">
        <circle r="62" fill="${accent}" fill-opacity="0.1" stroke="${accent}" stroke-width="3"/>
        <circle r="48" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="2 4"/>
        <text text-anchor="middle" y="-4" font-family="Georgia, serif" font-size="14" fill="${accent}" font-weight="700">OFFICIAL</text>
        <text text-anchor="middle" y="20" font-family="Georgia, serif" font-size="14" fill="${accent}" font-weight="700">SEAL</text>
      </g>`}

  <!-- Right: date + tutor + cert code -->
  <g>
    <line x1="${W * 0.82 - 130}" y1="${H - 200}" x2="${W * 0.82 + 130}" y2="${H - 200}" stroke="#374151" stroke-width="2"/>
    <text x="${W * 0.82}" y="${H - 170}" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1f2937" font-weight="700">${escape(date)}</text>
    <text x="${W * 0.82}" y="${H - 140}" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#6b7280">Date Issued${instructor ? ` · Tutor: ${escape(instructor)}` : ""}</text>
  </g>

  <!-- Cert code (bottom) -->
  <text x="${W / 2}" y="${H - 80}" text-anchor="middle" font-family="'Courier New', monospace" font-size="14" fill="#9ca3af" letter-spacing="2">CERTIFICATE ID: ${escape(code)}</text>
</svg>`;
}

async function svgToCanvas(svgString: string, scale = 2): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas context unavailable")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function CourseCertificate() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<"" | "png" | "jpg" | "pdf">("");
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: course } = useQuery<any>({
    queryKey: ["/api/courses", id],
    queryFn: async () => (await fetch(`/api/courses/${id}`)).json(),
    enabled: !!id,
  });

  const { data: progress } = useQuery<any>({
    queryKey: ["/api/courses", id, "progress"],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/progress`)).json(),
    enabled: !!id && isAuthenticated,
  });

  const { data: tpl } = useQuery<any>({
    queryKey: ["/api/certificate-template"],
    queryFn: async () => (await fetch("/api/certificate-template")).json(),
  });

  const cert = progress?.certificate;

  const svgString = useMemo(() => {
    if (!cert || !tpl) return "";
    return buildCertificateSvg(cert, tpl, course);
  }, [cert, tpl, course]);

  const handleDownload = async (kind: "png" | "jpg" | "pdf") => {
    if (!svgString) return;
    setDownloading(kind);
    try {
      const canvas = await svgToCanvas(svgString, 2);
      const fileBase = `certificate-${cert.certCode}`;
      if (kind === "png") {
        downloadDataUrl(canvas.toDataURL("image/png"), `${fileBase}.png`);
      } else if (kind === "jpg") {
        downloadDataUrl(canvas.toDataURL("image/jpeg", 0.95), `${fileBase}.jpg`);
      } else {
        const { jsPDF } = await import("jspdf");
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        pdf.addImage(dataUrl, "JPEG", 0, 0, pw, ph);
        pdf.save(`${fileBase}.pdf`);
      }
      toast({ title: "Download started", description: `Your certificate (${kind.toUpperCase()}) is on its way!` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message || "Could not export certificate", variant: "destructive" });
    } finally {
      setDownloading("");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/certificates/${cert?.certCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Share this verification link with anyone." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 max-w-md mx-auto text-center px-4">
          <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p>Please sign in to view your certificate.</p>
          <Link href="/login"><Button className="mt-3">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 max-w-lg mx-auto text-center px-4">
          <Award className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Certificate not yet available</h2>
          <p className="text-sm text-gray-600 mb-4">
            Complete every lesson in this course to unlock your certificate.
            {progress && ` (${progress.completedCount}/${progress.totalLessons} done)`}
          </p>
          <Link href={`/breedskool/${id}/learn`}>
            <Button className="bg-violet-600 hover:bg-violet-700">Continue learning</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      <NavigationFixed />

      <div className="pt-24 max-w-6xl mx-auto px-4 pb-16">
        {/* Celebration header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 text-white shadow-xl mb-4 animate-bounce">
            <Trophy className="h-10 w-10" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent mb-3">
            Congratulations, you did it! 🎉
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            You've officially earned your certificate for{" "}
            <span className="font-semibold text-gray-900">{cert.courseTitle}</span>.
            Download it below — print it, frame it, share it. You earned it.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-violet-600">
            <Sparkles className="h-4 w-4" />
            <span>Verification ID: <code className="font-mono text-xs bg-violet-100 px-2 py-0.5 rounded">{cert.certCode}</code></span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          <Link href={`/breedskool/${id}/learn`}>
            <Button variant="outline" data-testid="button-back-to-learn"><ArrowLeft className="h-4 w-4 mr-1" /> Back to course</Button>
          </Link>
          <Button
            onClick={() => handleDownload("pdf")}
            disabled={!!downloading}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            data-testid="button-download-pdf"
          >
            {downloading === "pdf" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Download PDF
          </Button>
          <Button
            onClick={() => handleDownload("png")}
            disabled={!!downloading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            data-testid="button-download-png"
          >
            {downloading === "png" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            PNG
          </Button>
          <Button
            onClick={() => handleDownload("jpg")}
            disabled={!!downloading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="button-download-jpg"
          >
            {downloading === "jpg" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            JPG
          </Button>
          <Button variant="outline" onClick={handleShare} data-testid="button-share-certificate">
            <Share2 className="h-4 w-4 mr-1" /> Copy share link
          </Button>
        </div>

        {/* Certificate preview */}
        <div className="bg-white rounded-2xl shadow-2xl border p-3 sm:p-6 overflow-hidden">
          <div ref={previewRef} className="w-full" dangerouslySetInnerHTML={{ __html: svgString }} style={{ maxHeight: "75vh", overflow: "auto" }} />
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Anyone can verify this certificate at{" "}
          <Link href={`/certificates/${cert.certCode}`}>
            <span className="text-violet-600 underline">/certificates/{cert.certCode}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
