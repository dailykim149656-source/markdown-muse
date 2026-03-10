import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { ChevronDown, ChevronUp, Replace, ReplaceAll, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/useI18n";
import type { PlainTextFindReplaceAdapter } from "./findReplaceTypes";
import {
  clearFindReplaceHighlights,
  getFindReplaceHighlightState,
  updateFindReplaceHighlights,
  type FindReplaceMatch,
} from "./extensions/FindReplaceHighlight";
import { getPlainTextMatches as getPlainTextSearchMatches, normalizeMatchIndex } from "./utils/structuredDataHighlight";

interface FindReplaceBarProps {
  editor: Editor | null;
  plainTextAdapter?: PlainTextFindReplaceAdapter | null;
  open: boolean;
  onClose: () => void;
}

const replacePlainTextRange = (text: string, match: FindReplaceMatch, replacement: string) => {
  return `${text.slice(0, match.from)}${replacement}${text.slice(match.to)}`;
};

const replaceAllPlainTextMatches = (text: string, matchList: FindReplaceMatch[], replacement: string) => {
  let nextText = text;

  for (let index = matchList.length - 1; index >= 0; index -= 1) {
    nextText = replacePlainTextRange(nextText, matchList[index], replacement);
  }

  return nextText;
};

const FindReplaceBar = ({ editor, plainTextAdapter, open, onClose }: FindReplaceBarProps) => {
  const { t } = useI18n();
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  const clearMatches = useCallback(() => {
    setMatchCount(0);
    setCurrentMatch(0);
  }, []);

  const applyPluginState = useCallback((pluginState: ReturnType<typeof getFindReplaceHighlightState>) => {
    const matches = pluginState?.matches ?? [];
    setMatchCount(matches.length);
    setCurrentMatch(matches.length > 0 ? pluginState!.currentIndex + 1 : 0);
  }, []);

  const applyPlainTextState = useCallback((matchList: FindReplaceMatch[], preferredIndex = 0) => {
    setMatchCount(matchList.length);

    const nextIndex = normalizeMatchIndex(preferredIndex, matchList.length);
    setCurrentMatch(matchList.length > 0 ? nextIndex + 1 : 0);

    return nextIndex;
  }, []);

  const focusRichTextMatch = useCallback((index: number, matchList: FindReplaceMatch[]) => {
    if (!editor || !matchList[index]) {
      return;
    }

    const match = matchList[index];
    editor.commands.focus();

    const transaction = editor.state.tr
      .setSelection(TextSelection.create(editor.state.doc, match.from, match.to))
      .scrollIntoView();

    editor.view.dispatch(transaction);
    setCurrentMatch(index + 1);
  }, [editor]);

  const focusPlainTextMatch = useCallback((index: number, matchList: FindReplaceMatch[]) => {
    if (!plainTextAdapter || !matchList[index]) {
      return;
    }

    const match = matchList[index];
    plainTextAdapter.setSelection(match.from, match.to);
    setCurrentMatch(index + 1);
  }, [plainTextAdapter]);

  const syncMatches = useCallback((searchText: string, preferredIndex?: number) => {
    if (!searchText.trim()) {
      if (editor) {
        clearFindReplaceHighlights(editor);
      }
      plainTextAdapter?.setSearchState?.("", 0);
      clearMatches();
      return;
    }

    if (editor) {
      const pluginState = updateFindReplaceHighlights(editor, searchText, preferredIndex ?? 0);
      applyPluginState(pluginState);

      if (pluginState && pluginState.matches.length > 0) {
        focusRichTextMatch(pluginState.currentIndex, pluginState.matches);
      }

      return;
    }

    if (!plainTextAdapter) {
      clearMatches();
      return;
    }

    const matchList = getPlainTextSearchMatches(plainTextAdapter.getText(), searchText) as FindReplaceMatch[];
    const nextIndex = applyPlainTextState(matchList, preferredIndex ?? 0);
    plainTextAdapter.setSearchState?.(searchText, nextIndex);

    if (matchList.length > 0) {
      focusPlainTextMatch(nextIndex, matchList);
    }
  }, [
    applyPlainTextState,
    applyPluginState,
    clearMatches,
    editor,
    focusPlainTextMatch,
    focusRichTextMatch,
    plainTextAdapter,
  ]);

  const navigateMatch = useCallback((direction: "next" | "prev") => {
    if (editor) {
      const pluginState = getFindReplaceHighlightState(editor);
      const matchList = pluginState?.matches ?? [];

      if (matchList.length === 0) {
        return;
      }

      const zeroBasedCurrent = pluginState?.currentIndex ?? Math.max(currentMatch - 1, 0);
      const nextIndex = direction === "next"
        ? (zeroBasedCurrent + 1) % matchList.length
        : (zeroBasedCurrent - 1 + matchList.length) % matchList.length;

      const nextState = updateFindReplaceHighlights(editor, findText, nextIndex);
      applyPluginState(nextState);

      if (nextState && nextState.matches.length > 0) {
        focusRichTextMatch(nextState.currentIndex, nextState.matches);
      }

      return;
    }

    if (!plainTextAdapter) {
      return;
    }

    const matchList = getPlainTextSearchMatches(plainTextAdapter.getText(), findText) as FindReplaceMatch[];

    if (matchList.length === 0) {
      plainTextAdapter.setSearchState?.(findText, 0);
      clearMatches();
      return;
    }

    const zeroBasedCurrent = normalizeMatchIndex(currentMatch - 1, matchList.length);
    const nextIndex = direction === "next"
      ? (zeroBasedCurrent + 1) % matchList.length
      : (zeroBasedCurrent - 1 + matchList.length) % matchList.length;

    applyPlainTextState(matchList, nextIndex);
    plainTextAdapter.setSearchState?.(findText, nextIndex);
    focusPlainTextMatch(nextIndex, matchList);
  }, [
    applyPlainTextState,
    applyPluginState,
    clearMatches,
    currentMatch,
    editor,
    findText,
    focusPlainTextMatch,
    focusRichTextMatch,
    plainTextAdapter,
  ]);

  const handleReplace = useCallback(() => {
    if (editor) {
      const pluginState = getFindReplaceHighlightState(editor);

      if (!pluginState || pluginState.matches.length === 0) {
        return;
      }

      const activeIndex = pluginState.currentIndex;
      const match = pluginState.matches[activeIndex];

      if (!match) {
        return;
      }

      const transaction = editor.state.tr.insertText(replaceText, match.from, match.to).scrollIntoView();
      editor.view.dispatch(transaction);
      const nextState = getFindReplaceHighlightState(editor);
      applyPluginState(nextState);

      if (nextState && nextState.matches.length > 0) {
        focusRichTextMatch(nextState.currentIndex, nextState.matches);
      }

      return;
    }

    if (!plainTextAdapter) {
      return;
    }

    const currentTextValue = plainTextAdapter.getText();
    const matchList = getPlainTextSearchMatches(currentTextValue, findText) as FindReplaceMatch[];

    if (matchList.length === 0) {
      plainTextAdapter.setSearchState?.(findText, 0);
      clearMatches();
      return;
    }

    const activeIndex = normalizeMatchIndex(currentMatch - 1, matchList.length);
    const match = matchList[activeIndex];

    if (!match) {
      return;
    }

    const nextText = replacePlainTextRange(currentTextValue, match, replaceText);
    plainTextAdapter.updateText(nextText);

    const nextMatchList = getPlainTextSearchMatches(nextText, findText) as FindReplaceMatch[];
    const nextIndex = normalizeMatchIndex(activeIndex, nextMatchList.length);

    applyPlainTextState(nextMatchList, nextIndex);
    plainTextAdapter.setSearchState?.(findText, nextIndex);

    if (nextMatchList.length > 0) {
      focusPlainTextMatch(nextIndex, nextMatchList);
    } else {
      plainTextAdapter.focus();
    }
  }, [
    applyPlainTextState,
    applyPluginState,
    clearMatches,
    currentMatch,
    editor,
    findText,
    focusPlainTextMatch,
    focusRichTextMatch,
    plainTextAdapter,
    replaceText,
  ]);

  const handleReplaceAll = useCallback(() => {
    if (editor) {
      const pluginState = getFindReplaceHighlightState(editor);

      if (!pluginState || pluginState.matches.length === 0) {
        return;
      }

      const transaction = editor.state.tr;

      for (let index = pluginState.matches.length - 1; index >= 0; index -= 1) {
        const match = pluginState.matches[index];
        transaction.insertText(replaceText, match.from, match.to);
      }

      editor.view.dispatch(transaction.scrollIntoView());
      applyPluginState(getFindReplaceHighlightState(editor));
      return;
    }

    if (!plainTextAdapter) {
      return;
    }

    const currentTextValue = plainTextAdapter.getText();
    const matchList = getPlainTextSearchMatches(currentTextValue, findText) as FindReplaceMatch[];

    if (matchList.length === 0) {
      plainTextAdapter.setSearchState?.(findText, 0);
      clearMatches();
      return;
    }

    const nextText = replaceAllPlainTextMatches(currentTextValue, matchList, replaceText);
    plainTextAdapter.updateText(nextText);

    const nextMatchList = getPlainTextSearchMatches(nextText, findText) as FindReplaceMatch[];
    applyPlainTextState(nextMatchList, 0);
    plainTextAdapter.setSearchState?.(findText, 0);

    if (nextMatchList.length > 0) {
      focusPlainTextMatch(0, nextMatchList);
    } else {
      plainTextAdapter.focus();
    }
  }, [
    applyPlainTextState,
    applyPluginState,
    clearMatches,
    editor,
    findText,
    focusPlainTextMatch,
    plainTextAdapter,
    replaceText,
  ]);

  useEffect(() => {
    if (open) {
      findInputRef.current?.focus();
      return;
    }

    if (editor) {
      clearFindReplaceHighlights(editor);
    }

    plainTextAdapter?.setSearchState?.("", 0);
    clearMatches();
    setFindText("");
    setReplaceText("");
    setShowReplace(false);
  }, [clearMatches, editor, open, plainTextAdapter]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      syncMatches(findText);
    }, 150);

    return () => clearTimeout(timer);
  }, [editor, findText, open, plainTextAdapter, syncMatches]);

  if (!open) {
    return null;
  }

  const isSearchAvailable = Boolean(editor || plainTextAdapter);

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-secondary/50 px-3 py-2 sm:flex-row sm:items-start">
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            ref={findInputRef}
            value={findText}
            onChange={(event) => setFindText(event.target.value)}
            placeholder={isSearchAvailable ? t("findReplace.findPlaceholder") : t("findReplace.searchUnavailable")}
            className="h-8 w-full flex-1 text-xs sm:h-7 sm:max-w-xs"
            disabled={!isSearchAvailable}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigateMatch(event.shiftKey ? "prev" : "next");
              }
              if (event.key === "Escape") {
                onClose();
              }
            }}
          />
          <span className="min-w-[70px] text-[10px] text-muted-foreground">
            {isSearchAvailable
              ? (matchCount > 0 ? `${currentMatch}/${matchCount}` : t("findReplace.noMatches"))
              : t("findReplace.searchUnavailable")}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-6 sm:w-6" onClick={() => navigateMatch("prev")} disabled={!isSearchAvailable || matchCount === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-6 sm:w-6" onClick={() => navigateMatch("next")} disabled={!isSearchAvailable || matchCount === 0}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] sm:h-6 sm:px-1.5" onClick={() => setShowReplace((value) => !value)} disabled={!isSearchAvailable}>
            {t("findReplace.replace")}
          </Button>
        </div>
        {showReplace && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              value={replaceText}
              onChange={(event) => setReplaceText(event.target.value)}
              placeholder={t("findReplace.replacePlaceholder")}
              className="h-8 w-full flex-1 text-xs sm:h-7 sm:max-w-xs"
              disabled={!isSearchAvailable}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleReplace();
                }
                if (event.key === "Escape") {
                  onClose();
                }
              }}
            />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-6 sm:w-6" onClick={handleReplace} disabled={!isSearchAvailable || matchCount === 0} title={t("findReplace.replace")}>
              <Replace className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-6 sm:w-6" onClick={handleReplaceAll} disabled={!isSearchAvailable || matchCount === 0} title={t("findReplace.replaceAll")}>
              <ReplaceAll className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" className="mt-0.5 h-7 w-7 self-end p-0 sm:h-6 sm:w-6" onClick={onClose}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default FindReplaceBar;
