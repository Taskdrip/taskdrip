import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Link2, Mail, Check, Share2, Facebook, Twitter } from "lucide-react";

export interface SharePanelProps {
  title: string;
  description?: string;
  url?: string;      // relative or absolute; defaults to current page
  image?: string;    // absolute URL used by Pinterest, og:image fallback
  compact?: boolean; // icon-only row (no label chips), used inside feeds
}

function resolveUrl(url?: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://taskdrip.com";
  if (!url) return typeof window !== "undefined" ? window.location.href : base;
  if (url.startsWith("http")) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function resolveImage(image?: string) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  const base = typeof window !== "undefined" ? window.location.origin : "https://taskdrip.com";
  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
}

const enc = encodeURIComponent;

function buildLinks(title: string, desc: string, absUrl: string, absImage: string) {
  const snippet = desc ? desc.slice(0, 200) : title;
  const textAndUrl = `${title}\n\n${absUrl}`;

  return {
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${enc(absUrl)}`,
    twitter:   `https://twitter.com/intent/tweet?url=${enc(absUrl)}&text=${enc(title)}&via=taskdrip`,
    whatsapp:  `https://wa.me/?text=${enc(textAndUrl)}`,
    telegram:  `https://t.me/share/url?url=${enc(absUrl)}&text=${enc(title + (desc ? "\n" + desc.slice(0, 150) : ""))}`,
    // LinkedIn's legacy shareArticle endpoint supports title, summary, and source —
    // the modern share-offsite endpoint only accepts the url param and relies solely on OG tags.
    linkedin:  `https://www.linkedin.com/shareArticle?mini=true&url=${enc(absUrl)}&title=${enc(title)}&summary=${enc(snippet)}&source=Taskdrip`,
    // Pinterest requires the page image via the `media` param
    pinterest: `https://pinterest.com/pin/create/button/?url=${enc(absUrl)}&media=${enc(absImage)}&description=${enc(title + (desc ? " — " + snippet : ""))}`,
    reddit:    `https://www.reddit.com/submit?url=${enc(absUrl)}&title=${enc(title)}`,
    // Threads (Meta) — compose pre-filled with title + url
    threads:   `https://www.threads.net/intent/post?text=${enc(textAndUrl)}`,
    // Bluesky — compose pre-filled
    bluesky:   `https://bsky.app/intent/compose?text=${enc(textAndUrl)}`,
    // Flipboard — content discovery / news aggregator
    flipboard: `https://share.flipboard.com/bookmarklet/popout?v=2&title=${enc(title)}&url=${enc(absUrl)}`,
    email:     `mailto:?subject=${enc(title)}&body=${enc(`${snippet ? snippet + "\n\n" : ""}${absUrl}`)}`,
  };
}

type ChannelKey = keyof ReturnType<typeof buildLinks>;

const CHANNELS: {
  key: ChannelKey;
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
    color: "hover:bg-black hover:text-white hover:border-black",
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
    color: "hover:bg-sky-500 hover:text-white hover:border-sky-500",
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
    key: "pinterest",
    label: "Pinterest",
    color: "hover:bg-red-600 hover:text-white hover:border-red-600",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
  {
    key: "threads",
    label: "Threads",
    color: "hover:bg-gray-900 hover:text-white hover:border-gray-900",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.556-1.957.589-.647 1.089-1.552 1.403-2.82H15.56c-.305 1.101-1.033 2.146-2.06 2.842-1.04.704-2.341 1.064-3.873 1.07h-.007c-1.698 0-3.22-.447-4.339-1.295C4.12 18.686 3.36 17.28 3.36 15.619c0-2.82 2.107-4.876 6.266-5.106l4.25-.239v-1.286c0-1.488-.822-2.32-2.38-2.32-1.404 0-2.256.592-2.554 1.756l-1.97-.568C7.522 6.38 9.102 5.14 11.499 5.14c2.738 0 4.305 1.449 4.305 3.98v6.89h1.934v1.66h-1.984c-.174 1.485-.692 2.693-1.548 3.61-1.313 1.403-3.201 2.07-5.565 2.088l-.455.632zm3.386-8.624-3.764.21c-2.845.16-4.282 1.257-4.282 2.953 0 1.782 1.46 2.854 3.895 2.836 2.087-.015 3.651-.72 4.15-2.999v-2.001h.001z"/>
      </svg>
    ),
  },
  {
    key: "bluesky",
    label: "Bluesky",
    color: "hover:bg-sky-400 hover:text-white hover:border-sky-400",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
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
    key: "flipboard",
    label: "Flipboard",
    color: "hover:bg-red-500 hover:text-white hover:border-red-500",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M0 0v24h24V0H0zm18 6H6v12h6v-6h6V6z" />
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
  const absUrl   = resolveUrl(url);
  const absImage = resolveImage(image);
  const links    = buildLinks(title, description, absUrl, absImage);

  function openChannel(key: ChannelKey) {
    window.open(links[key], "_blank", "noopener,noreferrer,width=640,height=580");
  }

  async function copyLink() {
    // Copy title + URL so a paste anywhere is immediately useful
    const text = `${title}\n${absUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard!", description: "Title and link are ready to paste." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: absUrl });
    }
  }

  if (compact) {
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
          title="Copy title + link"
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
            Share with your audience and drive more people to Taskdrip.
          </p>
        </div>
      </div>

      {/* Social channel chips */}
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map(({ key, label, color, Icon }) => (
          <button
            key={key}
            onClick={() => openChannel(key)}
            title={`Share on ${label}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium shadow-sm transition-all duration-150 ${color}`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {label}
          </button>
        ))}

        {/* Copy link — copies title + URL */}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-300 bg-violet-50 text-violet-700 text-xs font-semibold shadow-sm hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all duration-150"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed">
        Sharing opens the platform's composer pre-filled with the title, description, and link.
        Pinterest also picks up the page image automatically.
      </p>
    </div>
  );
}

/** Inline trigger button that floats the SharePanel as a popover below it */
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
        aria-expanded={open}
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[22rem] sm:w-[26rem] shadow-2xl rounded-2xl">
            <SharePanel title={title} description={description} url={url} image={image} />
          </div>
        </>
      )}
    </div>
  );
}
