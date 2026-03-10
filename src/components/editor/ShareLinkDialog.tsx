import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Link2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/useI18n";

interface ShareLinkDialogProps {
  link: string | null;
  onCopy: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const ShareLinkDialog = ({
  link,
  onCopy,
  onOpenChange,
  open,
}: ShareLinkDialogProps) => {
  const { t } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const buildQr = async () => {
      if (!link) {
        setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(link, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      }
    };

    void buildQr();

    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t("shareDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {link ? t("shareDialog.description") : t("shareDialog.unavailable")}
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                {t("shareDialog.link")}
              </div>
              <Input readOnly value={link} className="text-xs" />
              <Button className="mt-3 w-full gap-2" onClick={onCopy} type="button" variant="outline">
                <Copy className="h-4 w-4" />
                {t("shareDialog.copy")}
              </Button>
            </div>

            <div className="rounded-lg border border-border/60 bg-background p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("shareDialog.qr")}
              </div>
              <div className="flex justify-center">
                {qrDataUrl ? (
                  <img
                    alt={t("shareDialog.qrAlt")}
                    className="h-52 w-52 rounded-md border border-border/60 bg-white p-2"
                    src={qrDataUrl}
                  />
                ) : (
                  <div className="flex h-52 w-52 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    {t("shareDialog.qrLoading")}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("shareDialog.useDocsy")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;
