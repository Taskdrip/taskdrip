import { SOCIALS } from "@/config/socials";
import { SiTelegram, SiWhatsapp, SiX, SiInstagram, SiFacebook, SiYoutube, SiTiktok } from "react-icons/si";

const socialLinks = [
  { href: SOCIALS.telegram, icon: SiTelegram, color: "#229ED9", label: "Telegram", bg: "hover:bg-[#229ED9]" },
  { href: SOCIALS.whatsapp, icon: SiWhatsapp, color: "#25D366", label: "WhatsApp", bg: "hover:bg-[#25D366]" },
  { href: SOCIALS.x, icon: SiX, color: "#000000", label: "X", bg: "hover:bg-black" },
  { href: SOCIALS.instagram, icon: SiInstagram, color: "#E1306C", label: "Instagram", bg: "hover:bg-[#E1306C]" },
  { href: SOCIALS.facebook, icon: SiFacebook, color: "#1877F2", label: "Facebook", bg: "hover:bg-[#1877F2]" },
  { href: SOCIALS.youtube, icon: SiYoutube, color: "#FF0000", label: "YouTube", bg: "hover:bg-[#FF0000]" },
  { href: SOCIALS.tiktok, icon: SiTiktok, color: "#010101", label: "TikTok", bg: "hover:bg-black" },
];

export function FloatingSocialBar() {
  return (
    <div className="hidden xl:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 flex-col items-start">
      {socialLinks.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className={`group flex items-center gap-0 overflow-hidden bg-white border border-gray-200 shadow-sm ${link.bg} hover:text-white transition-all duration-300 w-9 hover:w-28 h-9 first:rounded-tr-lg last:rounded-br-lg`}
            style={{ borderLeft: "none" }}
          >
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
              <Icon className="h-4 w-4 transition-colors group-hover:text-white" style={{ color: link.color }} />
            </div>
            <span className="text-xs font-semibold pr-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {link.label}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export function SocialIconStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {socialLinks.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Icon className="h-3.5 w-3.5" style={{ color: link.color }} />
          </a>
        );
      })}
    </div>
  );
}

export function SocialLinksGrid({ dark = false }: { dark?: boolean }) {
  const cards = [
    { href: SOCIALS.telegram, icon: SiTelegram, color: "#229ED9", label: "Telegram", desc: "Join our community", bg: dark ? "bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border-[#229ED9]/20" : "bg-[#229ED9]/5 hover:bg-[#229ED9]/10 border-[#229ED9]/20" },
    { href: SOCIALS.whatsapp, icon: SiWhatsapp, color: "#25D366", label: "WhatsApp", desc: "Chat with support", bg: dark ? "bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/20" : "bg-[#25D366]/5 hover:bg-[#25D366]/10 border-[#25D366]/20" },
    { href: SOCIALS.x, icon: SiX, color: dark ? "#ffffff" : "#000000", label: "X (Twitter)", desc: "Follow for updates", bg: dark ? "bg-white/10 hover:bg-white/20 border-white/20" : "bg-gray-100 hover:bg-gray-200 border-gray-200" },
    { href: SOCIALS.instagram, icon: SiInstagram, color: "#E1306C", label: "Instagram", desc: "See our content", bg: dark ? "bg-[#E1306C]/10 hover:bg-[#E1306C]/20 border-[#E1306C]/20" : "bg-[#E1306C]/5 hover:bg-[#E1306C]/10 border-[#E1306C]/20" },
    { href: SOCIALS.youtube, icon: SiYoutube, color: "#FF0000", label: "YouTube", desc: "Watch tutorials", bg: dark ? "bg-[#FF0000]/10 hover:bg-[#FF0000]/20 border-[#FF0000]/20" : "bg-[#FF0000]/5 hover:bg-[#FF0000]/10 border-[#FF0000]/20" },
    { href: SOCIALS.tiktok, icon: SiTiktok, color: dark ? "#ffffff" : "#010101", label: "TikTok", desc: "Short form content", bg: dark ? "bg-white/10 hover:bg-white/20 border-white/20" : "bg-gray-100 hover:bg-gray-200 border-gray-200" },
    { href: SOCIALS.facebook, icon: SiFacebook, color: "#1877F2", label: "Facebook", desc: "Connect with us", bg: dark ? "bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border-[#1877F2]/20" : "bg-[#1877F2]/5 hover:bg-[#1877F2]/10 border-[#1877F2]/20" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <a
            key={card.href}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group ${card.bg}`}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/10">
              <Icon className="h-5 w-5 transition-transform group-hover:scale-110" style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>{card.label}</p>
              <p className={`text-xs truncate ${dark ? "text-white/60" : "text-gray-500"}`}>{card.desc}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
