import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";

interface KeyboardShortcutsModalProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const modifierKey = isMac ? "⌘" : "Ctrl";

const KeyboardShortcutsModal = ({ onOpenChange, open }: KeyboardShortcutsModalProps) => {
  const { t } = useI18n();
  const shortcutGroups = [
    {
      shortcuts: [
        { description: t("keyboardShortcuts.items.undo"), keys: `${modifierKey}+Z` },
        { description: t("keyboardShortcuts.items.redo"), keys: `${modifierKey}+Shift+Z` },
        { description: t("keyboardShortcuts.items.find"), keys: `${modifierKey}+F` },
        { description: t("keyboardShortcuts.items.findReplace"), keys: `${modifierKey}+H` },
        { description: t("keyboardShortcuts.items.shortcuts"), keys: `${modifierKey}+/` },
        { description: t("keyboardShortcuts.items.fullscreen"), keys: "F11" },
      ],
      title: t("keyboardShortcuts.groups.general"),
    },
    {
      shortcuts: [
        { description: t("keyboardShortcuts.items.bold"), keys: `${modifierKey}+B` },
        { description: t("keyboardShortcuts.items.italic"), keys: `${modifierKey}+I` },
        { description: t("keyboardShortcuts.items.underline"), keys: `${modifierKey}+U` },
        { description: t("keyboardShortcuts.items.strike"), keys: `${modifierKey}+Shift+X` },
        { description: t("keyboardShortcuts.items.inlineCode"), keys: `${modifierKey}+E` },
        { description: t("keyboardShortcuts.items.highlight"), keys: `${modifierKey}+Shift+H` },
      ],
      title: t("keyboardShortcuts.groups.formatting"),
    },
    {
      shortcuts: [
        { description: t("keyboardShortcuts.items.heading1"), keys: `${modifierKey}+Alt+1` },
        { description: t("keyboardShortcuts.items.heading2"), keys: `${modifierKey}+Alt+2` },
        { description: t("keyboardShortcuts.items.heading3"), keys: `${modifierKey}+Alt+3` },
        { description: t("keyboardShortcuts.items.bulletList"), keys: `${modifierKey}+Shift+8` },
        { description: t("keyboardShortcuts.items.orderedList"), keys: `${modifierKey}+Shift+7` },
        { description: t("keyboardShortcuts.items.blockquote"), keys: `${modifierKey}+Shift+B` },
      ],
      title: t("keyboardShortcuts.groups.blocks"),
    },
    {
      shortcuts: [
        { description: t("keyboardShortcuts.items.alignLeft"), keys: `${modifierKey}+Shift+L` },
        { description: t("keyboardShortcuts.items.alignCenter"), keys: `${modifierKey}+Shift+E` },
        { description: t("keyboardShortcuts.items.alignRight"), keys: `${modifierKey}+Shift+R` },
        { description: t("keyboardShortcuts.items.alignJustify"), keys: `${modifierKey}+Shift+J` },
      ],
      title: t("keyboardShortcuts.groups.alignment"),
    },
  ];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{t("keyboardShortcuts.title")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 pr-3">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <div key={shortcut.keys} className="flex items-center justify-between py-1">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      <kbd className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
