import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { openWhatsAppOrder, whatsappHeader } from "@/lib/whatsapp";

interface WhatsAppConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: string;
  lines: string[];
  autoOpen?: boolean;
  ctaLabel?: string;
}

export function WhatsAppConfirmDialog({
  open,
  onOpenChange,
  title,
  summary,
  lines,
  autoOpen = false,
  ctaLabel = "Send to admin on WhatsApp",
}: WhatsAppConfirmDialogProps) {
  useEffect(() => {
    if (open && autoOpen) {
      const t = setTimeout(() => {
        openWhatsAppOrder([...whatsappHeader(title), ...lines]);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [open, autoOpen, title, lines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-whatsapp-confirm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-green-800 mb-2">Order summary</p>
          <div className="space-y-1 text-gray-700 max-h-40 overflow-y-auto">
            {lines.filter(Boolean).map((line, i) => (
              <p key={i} className="break-words" data-testid={`text-wa-line-${i}`}>
                {line}
              </p>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Tap the button below to forward this confirmation to our team. We'll review it and get back to you shortly.
        </p>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-wa-skip">
            Skip
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              openWhatsAppOrder([...whatsappHeader(title), ...lines]);
              onOpenChange(false);
            }}
            data-testid="button-wa-send"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" /> {ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
