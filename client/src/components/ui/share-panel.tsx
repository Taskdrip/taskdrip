import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Link2, Mail, Check, Share2,
  Facebook, Twitter, MessageCircle,
} from "lucide-react";

export interface SharePanelProps {
  title: string;
  description?: string;
  url?: string;          // relative or absolute; defaults to current page
  image?: string;        // absolute URL or relative path for og:image in the preview
  compact?: boolean;     // icon-only row (no label chips), used inside feeds
}

function resolveUrl(url?: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://taskdrip.com";
  if (!url) return typeof window !== "undefined" ? window.location.href : base;
  if (url.startsWith("http")) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function encode(s: string) {
  return encodeURIComponent(s);
}

function buildLinks(title: string, desc: string, absUrl: string) {
  const textAndUrl = `${title}\n${absUrl}`;
  return {
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encode(absUrl)}`,
    twitter:   `https://twitter.com/intent/tweet?url=${encode(absUrl)}&text=${encode(title)}&via=taskdrip`,
    whatsapp:  `https://wa.me/?text=${encode(textAndUrl)}`,
    telegram:  `https://t.me/share/url?url=${encode(absUrl)}&text=${encode(title)}`,
    linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${encode(absUrl)}`,
    reddit:    `https://www.reddit.com/submit?url=${encode(absUrl)}&title=${encode(title)}`,
    email:     `mailto:?subject=${encode(title)}&body=${encode(`${desc ? desc + "\n\n" : ""}${absUrl}`)}`,
  };
}

const CHANNELS: {
  key: keyof ReturnType<typeof buildLinks>;
  label: string;
  color: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  {
    key: "facebook",
    label: "Facebook",
    color: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
    Icon: Facebook,
  },
  {
    key: "twitter",
    label: "X / Twitter",
    color: "hover:bg-sky-500 hover:text-white hover:border-sky-500",
    Icon: Twitter,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    color: "hover:bg-green-500 hover:text-white hover:border-green-500",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.116 1.522 5.847L0 24l6.335-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.016-1.378l-.36-.214-3.732.979 1.004-3.642-.235-.375A9.818 9.818 0 1112 21.818z" />
      </svg>
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    color: "hover:bg-sky-600 hover:text-white hover:border-sky-600",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
      </svg>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "hover:bg-blue-700 hover:text-white hover:border-blue-700",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: "reddit",
    label: "Reddit",
    color: "hover:bg-orange-500 hover:text-white hover:border-orange-500",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    key: "email",
    label: "Email",
    color: "hover:bg-gray-700 hover:text-white hover:border-gray-700",
    Icon: Mail,
  },
];

export function SharePanel({ title, description = "", url, image, compact = false }: SharePanelProps) {
  const [copied, setCopied] = useState(false);
  const absUrl = resolveUrl(url);
  const links = buildLinks(title, description, absUrl);

  function openChannel(key: keyof typeof links) {
    window.open(links[key], "_blank", "noopener,noreferrer,width=600,height=600");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Paste it anywhere to share." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: absUrl });
    }
  }

  if (compact) {
    // Compact row: icon-only buttons, no note
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {CHANNELS.map(({ key, label, color, Icon }) => (
          <button
            key={key}
            title={`Share on ${label}`}
            onClick={() => openChannel(key)}
            className={`p-1.5 rounded-full border border-transparent text-gray-400 transition-all duration-150 ${color}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <button
          title="Copy link"
          onClick={copyLink}
          className="p-1.5 rounded-full border border-transparent text-gray-400 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all duration-150"
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 space-y-4">
      {/* Encouraging note */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-sm">
          <Share2 className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-snug">
            Love this? Help others discover it! 🚀
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Share with your network and bring more people to Taskdrip.
          </p>
        </div>
      </div>

      {/* Social channel buttons */}
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map(({ key, label, color, Icon }) => (
          <button
            key={key}
            onClick={() => openChannel(key)}
            title={`Share on ${label}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium shadow-sm transition-all duration-150 ${color}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium shadow-sm hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all duration-150"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

/** Minimal inline trigger + popover-style panel shown below a share icon button */
export function ShareButton({
  title, description, url, image,
  className = "",
}: SharePanelProps & { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        className={`rounded-full gap-2 ${className}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Share"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      {open && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 shadow-xl">
            <SharePanel title={title} description={description} url={url} image={image} />
          </div>
        </>
      )}
    </div>
  );
}
