import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import { loadKatex } from "@/lib/rendering/loadKatex";

interface MathRenderProps {
  latex: string;
  displayMode: boolean;
  className?: string;
  emptyLabel?: string;
  errorClassName?: string;
  renderErrorLabel?: string;
}

type RenderState = {
  html: string;
  error: string;
};

const MathRender = ({
  latex,
  displayMode,
  className = "",
  emptyLabel,
  errorClassName = "",
  renderErrorLabel = "Failed to render math.",
}: MathRenderProps) => {
  const [renderState, setRenderState] = useState<RenderState>({ error: "", html: "" });

  useEffect(() => {
    let cancelled = false;

    if (!latex) {
      setRenderState({ error: "", html: "" });
      return;
    }

    setRenderState({ error: "", html: "" });

    loadKatex()
      .then((katex) => {
        const html = katex.renderToString(latex, {
          displayMode,
          throwOnError: false,
          trust: false,
          strict: false,
        });

        if (!cancelled) {
          setRenderState({ error: "", html });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRenderState({
            error: error instanceof Error ? error.message : renderErrorLabel,
            html: "",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayMode, latex, renderErrorLabel]);

  if (!latex) {
    return emptyLabel ? <span className="text-sm italic text-muted-foreground">{emptyLabel}</span> : null;
  }

  if (renderState.error) {
    return (
      <span className={`rounded bg-destructive/10 px-1 font-mono text-sm text-destructive ${errorClassName}`.trim()}>
        {latex}
        <span className="mt-0.5 block text-[10px] text-destructive/70">{renderState.error}</span>
      </span>
    );
  }

  if (!renderState.html) {
    return <span className="font-mono text-sm text-muted-foreground/80">{latex}</span>;
  }

  return (
    <span
      dangerouslySetInnerHTML={{ __html: renderState.html }}
      className={`${displayMode ? "block text-center" : "inline"} math-rendered ${className}`.trim()}
    />
  );
};

export default MathRender;
