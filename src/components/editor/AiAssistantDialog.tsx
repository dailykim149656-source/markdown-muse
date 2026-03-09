import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentComparisonResult } from "@/lib/ai/compareDocuments";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { DocumentData } from "@/types/document";

type BusyAction = "compare" | "generate-section" | "summarize" | null;

interface ComparePreviewResult {
  comparison: DocumentComparisonResult;
  patchCount: number;
  patchSetTitle: string;
  targetDocumentName: string;
}

interface AiAssistantDialogProps {
  busyAction: BusyAction;
  compareCandidates: DocumentData[];
  comparePreview: ComparePreviewResult | null;
  onCompare: (targetDocumentId: string) => Promise<unknown> | unknown;
  onGenerateSection: (prompt: string) => Promise<unknown> | unknown;
  onOpenChange: (open: boolean) => void;
  onSummarize: (objective: string) => Promise<SummarizeDocumentResponse | unknown> | unknown;
  open: boolean;
  richTextAvailable: boolean;
  summaryResult: SummarizeDocumentResponse | null;
}

const AiAssistantDialog = ({
  busyAction,
  compareCandidates,
  comparePreview,
  onCompare,
  onGenerateSection,
  onOpenChange,
  onSummarize,
  open,
  richTextAvailable,
  summaryResult,
}: AiAssistantDialogProps) => {
  const [summaryObjective, setSummaryObjective] = useState("");
  const [sectionPrompt, setSectionPrompt] = useState("");
  const [compareTargetId, setCompareTargetId] = useState("");

  const isBusy = busyAction !== null;
  const compareOptions = useMemo(
    () => compareCandidates.map((candidate) => ({ id: candidate.id, name: candidate.name })),
    [compareCandidates],
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </DialogTitle>
          <DialogDescription>
            문서 요약, 문서 비교, 새 섹션 초안을 생성합니다.
          </DialogDescription>
        </DialogHeader>

        {!richTextAvailable ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            AI 기능은 Markdown, LaTeX, HTML 문서에서만 사용할 수 있습니다.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="summary-objective">문서 요약</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  요약 목적을 입력하면 핵심 내용을 정리합니다.
                </p>
              </div>
              <Textarea
                id="summary-objective"
                onChange={(event) => setSummaryObjective(event.target.value)}
                placeholder="예: 의사결정용 요약, 임원 보고용 요약"
                value={summaryObjective}
              />
              <Button
                className="w-full"
                disabled={isBusy || !summaryObjective.trim()}
                onClick={() => void onSummarize(summaryObjective)}
                type="button"
              >
                {busyAction === "summarize" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                요약 실행
              </Button>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="compare-target">문서 비교</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  다른 문서와 비교해 패치 후보를 생성합니다.
                </p>
              </div>
              <Select onValueChange={setCompareTargetId} value={compareTargetId}>
                <SelectTrigger id="compare-target">
                  <SelectValue placeholder="비교 대상 선택" />
                </SelectTrigger>
                <SelectContent>
                  {compareOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={isBusy || !compareTargetId}
                onClick={() => void onCompare(compareTargetId)}
                type="button"
                variant="outline"
              >
                {busyAction === "compare" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                비교 실행
              </Button>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="section-prompt">섹션 생성</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  추가할 섹션의 목적과 내용을 입력합니다.
                </p>
              </div>
              <Input
                id="section-prompt"
                onChange={(event) => setSectionPrompt(event.target.value)}
                placeholder="예: 운영 절차 섹션 추가"
                value={sectionPrompt}
              />
              <Button
                className="w-full"
                disabled={isBusy || !sectionPrompt.trim()}
                onClick={() => void onGenerateSection(sectionPrompt)}
                type="button"
                variant="secondary"
              >
                {busyAction === "generate-section" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                섹션 생성
              </Button>
            </section>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">요약 결과</h3>
            <ScrollArea className="mt-3 h-56">
              {summaryResult ? (
                <div className="space-y-3 text-sm">
                  <p className="whitespace-pre-wrap">{summaryResult.summary}</p>
                  {summaryResult.bulletPoints.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {summaryResult.bulletPoints.map((point, index) => (
                        <li key={`${summaryResult.requestId}-${index}`}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 요약 결과가 없습니다.</p>
              )}
            </ScrollArea>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">비교 결과</h3>
            <ScrollArea className="mt-3 h-56">
              {comparePreview ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">대상:</span> {comparePreview.targetDocumentName}</p>
                  <p><span className="font-medium">패치 수:</span> {comparePreview.patchCount}</p>
                  <p><span className="font-medium">패치 세트:</span> {comparePreview.patchSetTitle}</p>
                  <p className="text-muted-foreground">
                    추가 {comparePreview.comparison.counts.added} / 변경 {comparePreview.comparison.counts.changed} / 제거 {comparePreview.comparison.counts.removed}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 비교 결과가 없습니다.</p>
              )}
            </ScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiAssistantDialog;
