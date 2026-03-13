import { clearDocumentVersionSnapshots } from "@/lib/history/versionHistoryStore";
import { clearKnowledgeRecords } from "@/lib/knowledge/knowledgeStore";
import { clearSourceSnapshots } from "@/lib/knowledge/sourceSnapshotStore";

const RELEASE_CHECKLIST_STORAGE_KEY = "docsy-release-checklist-v1";

export const resetLocalDocumentState = async () => {
  await Promise.all([
    clearDocumentVersionSnapshots(),
    clearKnowledgeRecords(),
    clearSourceSnapshots(),
  ]);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(RELEASE_CHECKLIST_STORAGE_KEY);
  } catch {
    // best effort cleanup
  }
};
