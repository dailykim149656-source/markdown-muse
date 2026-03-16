import { toast } from "sonner";

export const RESTORED_SESSION_TOAST_ID = "docsy-restored-session";
export const UNEXPECTED_RELOAD_RECOVERED_TOAST_ID = "docsy-unexpected-reload-recovered";
export const UNEXPECTED_RELOAD_LOST_TOAST_ID = "docsy-unexpected-reload-lost";

interface ShowRestoredSessionToastOptions {
  disabled?: boolean;
  onStartFresh: () => void;
  t: (key: string) => string;
}

interface ShowUnexpectedReloadRecoveredToastOptions {
  buildChanged?: boolean;
  disabled?: boolean;
  navigationType?: string;
  onStartFresh: () => void;
  t: (key: string) => string;
}

interface ShowUnexpectedReloadLostToastOptions {
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

export const showUnexpectedReloadRecoveredToast = ({
  buildChanged = false,
  disabled = false,
  navigationType,
  onStartFresh,
  t,
}: ShowUnexpectedReloadRecoveredToastOptions) => {
  const description = buildChanged
    ? t("toasts.unexpectedReloadRecoveredNewBuild")
    : navigationType === "back_forward"
      ? t("toasts.unexpectedReloadRecoveredBackForward")
      : t("toasts.unexpectedReloadRecovered");

  toast.info(description, {
    action: disabled
      ? undefined
      : {
        label: t("resetDocuments.action"),
        onClick: () => {
          toast.dismiss(UNEXPECTED_RELOAD_RECOVERED_TOAST_ID);
          onStartFresh();
        },
      },
    duration: 7000,
    id: UNEXPECTED_RELOAD_RECOVERED_TOAST_ID,
  });
};

export const showUnexpectedReloadLostToast = ({
  t,
}: ShowUnexpectedReloadLostToastOptions) => {
  toast.error(t("toasts.unexpectedReloadLost"), {
    duration: 9000,
    id: UNEXPECTED_RELOAD_LOST_TOAST_ID,
  });
};
