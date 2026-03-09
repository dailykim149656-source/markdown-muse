import { useMemo } from "react";
import { BookOpenText, ImageIcon, LoaderCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/useI18n";
import {
  getKnowledgeRecordLabel,
  type KnowledgeDocumentRecord,
  type KnowledgeSearchResult,
} from "@/lib/knowledge/knowledgeIndex";

interface KnowledgeSearchPanelProps {
  indexedDocumentCount: number;
  isReady: boolean;
  isSyncing: boolean;
  onOpenRecord: (record: KnowledgeDocumentRecord) => void;
  onOpenResult: (result: KnowledgeSearchResult) => void;
  query: string;
  recentRecords: KnowledgeDocumentRecord[];
  results: KnowledgeSearchResult[];
  setQuery: (value: string) => void;
}

const KnowledgeSearchPanel = ({
  indexedDocumentCount,
  isReady,
  isSyncing,
  onOpenRecord,
  onOpenResult,
  query,
  recentRecords,
  results,
  setQuery,
}: KnowledgeSearchPanelProps) => {
  const { t } = useI18n();
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const visibleResults = hasQuery ? results : [];
  const groupedResults = useMemo(() => {
    const groups = new Map<string, { record: KnowledgeDocumentRecord; results: KnowledgeSearchResult[] }>();

    for (const result of visibleResults) {
      const group = groups.get(result.record.documentId);

      if (group) {
        group.results.push(result);
        continue;
      }

      groups.set(result.record.documentId, {
        record: result.record,
        results: [result],
      });
    }

    return Array.from(groups.values());
  }, [visibleResults]);

  return (
    <div className="space-y-3 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpenText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{t("knowledge.title")}</span>
          </div>
          <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
            {indexedDocumentCount}
          </Badge>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {isSyncing ? t("knowledge.syncing") : t("knowledge.description")}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 pl-7 text-xs"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("knowledge.searchPlaceholder")}
          value={query}
        />
      </div>

      {!isReady && (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-3 text-[11px] text-muted-foreground">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          <span>{t("knowledge.loading")}</span>
        </div>
      )}

      {isReady && hasQuery && visibleResults.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-2 py-3 text-[11px] leading-4 text-muted-foreground">
          {t("knowledge.noResults")}
        </div>
      )}

      {isReady && hasQuery && visibleResults.length > 0 && (
        <div className="space-y-2">
          {groupedResults.map((group) => (
            <div className="rounded-md border border-border/60 bg-background p-2" key={group.record.documentId}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-foreground">
                    {getKnowledgeRecordLabel(group.record)}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {group.record.fileName}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {group.record.indexStatus === "stale" && (
                    <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="destructive">
                      {t("knowledge.stale")}
                    </Badge>
                  )}
                  <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
                    {group.results.length}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {group.results.map((result) => (
                  <button
                    className="w-full rounded-md border border-border/40 bg-background px-2 py-2 text-left transition-colors hover:bg-accent/40"
                    key={result.kind === "chunk"
                      ? `${result.record.documentId}-${result.match?.chunk.chunkId || "chunk"}`
                      : `${result.record.documentId}-${result.image?.imageId || "image"}`}
                    onClick={() => onOpenResult(result)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[10px] text-muted-foreground">
                          {result.kind === "chunk"
                            ? result.match?.chunk.metadata?.sectionTitle || result.record.fileName
                            : result.image?.metadata?.sectionTitle || result.image?.src || result.record.fileName}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {result.kind === "image" && (
                          <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
                            <ImageIcon className="mr-1 h-3 w-3" />
                            {t("knowledge.image")}
                          </Badge>
                        )}
                        <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="outline">
                          {result.score}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-[11px] leading-4 text-muted-foreground">
                      {result.snippet}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isReady && !hasQuery && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">{t("knowledge.recent")}</span>
            {isSyncing && (
              <span className="text-[10px] text-muted-foreground">{t("knowledge.syncingShort")}</span>
            )}
          </div>
          {recentRecords.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-2 py-3 text-[11px] leading-4 text-muted-foreground">
              {t("knowledge.empty")}
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentRecords.map((record) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                  key={record.documentId}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-xs font-medium text-foreground">
                        {getKnowledgeRecordLabel(record)}
                      </div>
                      {record.indexStatus === "stale" && (
                        <Badge className="h-4 rounded-full px-1 text-[9px]" variant="destructive">
                          {t("knowledge.stale")}
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {record.fileName}
                    </div>
                  </div>
                  <Button
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onOpenRecord(record)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("knowledge.open")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeSearchPanel;
