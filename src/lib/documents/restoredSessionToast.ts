import { toast } from "sonner";

export const RESTORED_SESSION_TOAST_ID = "docsy-restored-session";

interface ShowRestoredSessionToastOptions {
  disabled?: boolean;
  onStartFresh: () => void;
  t: (key: string) => string;
}

export const showRestoredSessionToast = ({
  disabled = false,
  onStartFresh,
  t,
}: ShowRestoredSessionToastOptions) => {
  toast.info(t("toasts.restoredSession"), {
    action: disabled
      ? undefined
      : {
        label: t("resetDocuments.action"),
        onClick: () => {
          toast.dismiss(RESTORED_SESSION_TOAST_ID);
          onStartFresh();
        },
      },
    duration: 4000,
    id: RESTORED_SESSION_TOAST_ID,
  });
};
