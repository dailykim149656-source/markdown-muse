import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const shortcutGroups = [
  {
    title: "일반",
    shortcuts: [
      { keys: `${mod}+Z`, desc: "실행 취소" },
      { keys: `${mod}+Shift+Z`, desc: "다시 실행" },
      { keys: `${mod}+F`, desc: "찾기" },
      { keys: `${mod}+H`, desc: "찾기 & 바꾸기" },
      { keys: `${mod}+/`, desc: "단축키 안내" },
      { keys: "F11", desc: "전체화면 전환" },
    ],
  },
  {
    title: "서식",
    shortcuts: [
      { keys: `${mod}+B`, desc: "굵게" },
      { keys: `${mod}+I`, desc: "기울임" },
      { keys: `${mod}+U`, desc: "밑줄" },
      { keys: `${mod}+Shift+X`, desc: "취소선" },
      { keys: `${mod}+E`, desc: "인라인 코드" },
      { keys: `${mod}+Shift+H`, desc: "형광펜" },
    ],
  },
  {
    title: "블록",
    shortcuts: [
      { keys: `${mod}+Alt+1`, desc: "제목 1" },
      { keys: `${mod}+Alt+2`, desc: "제목 2" },
      { keys: `${mod}+Alt+3`, desc: "제목 3" },
      { keys: `${mod}+Shift+8`, desc: "글머리 기호 목록" },
      { keys: `${mod}+Shift+7`, desc: "번호 목록" },
      { keys: `${mod}+Shift+B`, desc: "인용" },
    ],
  },
  {
    title: "정렬",
    shortcuts: [
      { keys: `${mod}+Shift+L`, desc: "왼쪽 정렬" },
      { keys: `${mod}+Shift+E`, desc: "가운데 정렬" },
      { keys: `${mod}+Shift+R`, desc: "오른쪽 정렬" },
      { keys: `${mod}+Shift+J`, desc: "양쪽 정렬" },
    ],
  },
];

const KeyboardShortcutsModal = ({ open, onOpenChange }: KeyboardShortcutsModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-base">⌨️ 키보드 단축키</DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-5 pr-3">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{s.desc}</span>
                    <kbd className="px-2 py-0.5 bg-secondary text-xs font-mono rounded border border-border text-muted-foreground">
                      {s.keys}
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

export default KeyboardShortcutsModal;
