export interface PlainTextFindReplaceAdapter {
  focus: () => void;
  getText: () => string;
  setSelection: (from: number, to: number) => void;
  setSearchState?: (searchText: string, currentIndex: number) => void;
  updateText: (nextText: string) => void;
}
