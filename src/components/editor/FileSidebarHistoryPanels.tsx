import FormatConsistencyPanel from "@/components/editor/FormatConsistencyPanel";
import VersionHistoryPanel from "@/components/editor/VersionHistoryPanel";
import { analyzeFormatConsistency } from "@/lib/analysis/formatConsistency";
import type { HistorySidebarPanelsProps } from "@/components/editor/sidebarFeatureTypes";

const FileSidebarHistoryPanels = ({
  activeDoc,
  onGenerateTocSuggestion,
  onRestoreVersionSnapshot,
  versionHistoryReady,
  versionHistoryRestoring,
  versionHistorySnapshots,
  versionHistorySyncing,
}: HistorySidebarPanelsProps) => {
  const formatConsistencyIssues = analyzeFormatConsistency(activeDoc);

  return (
    <div className="space-y-4">
      <FormatConsistencyPanel
        issues={formatConsistencyIssues}
        onGenerateToc={onGenerateTocSuggestion}
      />
      <VersionHistoryPanel
        isReady={versionHistoryReady}
        isRestoring={versionHistoryRestoring}
        isSyncing={versionHistorySyncing}
        onRestore={onRestoreVersionSnapshot}
        snapshots={versionHistorySnapshots}
      />
    </div>
  );
};

export default FileSidebarHistoryPanels;
