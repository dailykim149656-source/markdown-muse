import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { GitBranch, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/i18n/useI18n";
import MathRender from "./MathRender";

type MermaidCommandSet = {
  insertMermaid: () => boolean;
};

const MathMenu = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const [mode, setMode] = useState<"inline" | "block">("inline");

  const insertMath = () => {
    if (!latex) {
      return;
    }

    if (mode === "inline") {
      editor.chain().focus().insertContent({ attrs: { display: "inline", latex }, type: "math" }).run();
    } else {
      editor.chain().focus().insertContent({ attrs: { display: "block", latex }, type: "mathBlock" }).run();
    }

    setLatex("");
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.math.title")}>
          <Sigma className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <p className="text-sm font-medium">{t("toolbar.math.dialogTitle")}</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button className="h-7 text-xs" onClick={() => setMode("inline")} size="sm" variant={mode === "inline" ? "secondary" : "ghost"}>
            {t("toolbar.math.inline")}
          </Button>
          <Button className="h-7 text-xs" onClick={() => setMode("block")} size="sm" variant={mode === "block" ? "secondary" : "ghost"}>
            {t("toolbar.math.block")}
          </Button>
        </div>
        <textarea
          className="min-h-[60px] w-full resize-none rounded-md border border-border bg-secondary p-2 font-mono text-sm text-foreground outline-none"
          onChange={(event) => setLatex(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              insertMath();
            }
          }}
          placeholder={mode === "inline" ? t("toolbar.math.inlinePlaceholder") : t("toolbar.math.blockPlaceholder")}
          rows={3}
          value={latex}
        />
        {latex && (
          <div className="flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background p-3">
            <MathRender
              displayMode={mode === "block"}
              latex={latex}
              renderErrorLabel={t("toolbar.math.renderError")}
            />
          </div>
        )}
        <Button className="h-8 w-full text-sm" disabled={!latex} onClick={insertMath} size="sm">
          {t("toolbar.math.insert")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const EditorToolbarAdvancedTools = ({
  editor,
  mobile = false,
}: {
  editor: Editor;
  mobile?: boolean;
}) => {
  const { t } = useI18n();

  return (
    <div className={mobile ? "flex flex-wrap items-center gap-1" : "flex items-center gap-0.5"}>
      <MathMenu editor={editor} />
      <Toggle
        className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50"
        onPressedChange={() => (editor.commands as unknown as MermaidCommandSet).insertMermaid()}
        pressed={false}
        size="sm"
        title={t("toolbar.actions.mermaid")}
      >
        <GitBranch className="h-4 w-4" />
      </Toggle>
    </div>
  );
};

export default EditorToolbarAdvancedTools;
