import { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FindReplaceBarProps {
  open: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

const FindReplaceBar = ({ open, onClose, containerRef }: FindReplaceBarProps) => {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const highlightsRef = useRef<HTMLElement[]>([]);

  const clearHighlights = useCallback(() => {
    highlightsRef.current.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });
    highlightsRef.current = [];
    setMatchCount(0);
    setCurrentMatch(0);
  }, []);

  const highlightMatches = useCallback(
    (searchText: string) => {
      clearHighlights();
      if (!searchText || !containerRef.current) return;

      const container = containerRef.current.querySelector(".ProseMirror");
      if (!container) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
      }

      const matches: HTMLElement[] = [];
      const lowerSearch = searchText.toLowerCase();

      textNodes.forEach((node) => {
        const text = node.textContent || "";
        const lowerText = text.toLowerCase();
        let idx = lowerText.indexOf(lowerSearch);
        if (idx === -1) return;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;

        while (idx !== -1) {
          if (idx > lastIdx) {
            frag.appendChild(document.createTextNode(text.substring(lastIdx, idx)));
          }
          const mark = document.createElement("mark");
          mark.className = "find-highlight";
          mark.textContent = text.substring(idx, idx + searchText.length);
          frag.appendChild(mark);
          matches.push(mark);
          lastIdx = idx + searchText.length;
          idx = lowerText.indexOf(lowerSearch, lastIdx);
        }

        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.substring(lastIdx)));
        }

        node.parentNode?.replaceChild(frag, node);
      });

      highlightsRef.current = matches;
      setMatchCount(matches.length);
      if (matches.length > 0) {
        setCurrentMatch(1);
        matches[0].classList.add("find-highlight-current");
        matches[0].scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },
    [containerRef, clearHighlights]
  );

  const navigateMatch = useCallback(
    (direction: "next" | "prev") => {
      if (matchCount === 0) return;
      const marks = highlightsRef.current;
      marks.forEach((m) => m.classList.remove("find-highlight-current"));

      let next = direction === "next" ? currentMatch % matchCount : currentMatch - 2;
      if (next < 0) next = matchCount - 1;

      setCurrentMatch(next + 1);
      marks[next].classList.add("find-highlight-current");
      marks[next].scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [matchCount, currentMatch]
  );

  const handleReplace = useCallback(() => {
    if (matchCount === 0 || !highlightsRef.current.length) return;
    const mark = highlightsRef.current[currentMatch - 1];
    if (!mark) return;
    const textNode = document.createTextNode(replaceText);
    mark.parentNode?.replaceChild(textNode, mark);
    highlightsRef.current.splice(currentMatch - 1, 1);
    setMatchCount((c) => c - 1);
    if (highlightsRef.current.length > 0) {
      const newIdx = Math.min(currentMatch - 1, highlightsRef.current.length - 1);
      setCurrentMatch(newIdx + 1);
      highlightsRef.current[newIdx]?.classList.add("find-highlight-current");
    } else {
      setCurrentMatch(0);
    }
  }, [matchCount, currentMatch, replaceText]);

  const handleReplaceAll = useCallback(() => {
    highlightsRef.current.forEach((mark) => {
      const textNode = document.createTextNode(replaceText);
      mark.parentNode?.replaceChild(textNode, mark);
    });
    highlightsRef.current = [];
    setMatchCount(0);
    setCurrentMatch(0);
  }, [replaceText]);

  useEffect(() => {
    if (open) {
      findInputRef.current?.focus();
    } else {
      clearHighlights();
      setFindText("");
      setReplaceText("");
      setShowReplace(false);
    }
  }, [open, clearHighlights]);

  useEffect(() => {
    const timer = setTimeout(() => highlightMatches(findText), 200);
    return () => clearTimeout(timer);
  }, [findText, highlightMatches]);

  if (!open) return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-secondary/50 border-b border-border">
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5">
          <Input
            ref={findInputRef}
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="찾기..."
            className="h-7 text-xs flex-1 max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") navigateMatch(e.shiftKey ? "prev" : "next");
              if (e.key === "Escape") onClose();
            }}
          />
          <span className="text-[10px] text-muted-foreground min-w-[50px]">
            {matchCount > 0 ? `${currentMatch}/${matchCount}` : "결과 없음"}
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigateMatch("prev")} disabled={matchCount === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigateMatch("next")} disabled={matchCount === 0}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowReplace((v) => !v)}>
            바꾸기
          </Button>
        </div>
        {showReplace && (
          <div className="flex items-center gap-1.5">
            <Input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="바꿀 내용..."
              className="h-7 text-xs flex-1 max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReplace();
                if (e.key === "Escape") onClose();
              }}
            />
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleReplace} disabled={matchCount === 0} title="바꾸기">
              <Replace className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleReplaceAll} disabled={matchCount === 0} title="모두 바꾸기">
              <ReplaceAll className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-0.5" onClick={onClose}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default FindReplaceBar;
