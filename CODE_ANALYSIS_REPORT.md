# Docsy Editor - Code Quality Analysis Report

**Date**: March 9, 2026  
**Scope**: src/components/editor, src/hooks, src/pages, src/lib  
**Analysis Type**: Static code review for quality, performance, error handling, and test coverage

---

## Executive Summary

The markdown-muse (Docsy Editor) project is a sophisticated multi-format document editor with good overall architecture, but contains several code quality issues, missing error handling, incomplete error recovery patterns, and significant test coverage gaps. Below is a detailed breakdown of findings organized by category.

---

## 1. ERROR HANDLING & VALIDATION GAPS

### 1.1 Empty Catch Blocks (Silent Failures)
**Severity**: HIGH

#### Location: [src/hooks/useEditorUiState.ts](src/hooks/useEditorUiState.ts#L46-L50)
```javascript
// Lines 46, 50 - Fullscreen API errors silently ignored
.catch(() => {})  // No error reporting to user
```
**Issue**: Fullscreen API failures are swallowed without user notification. Users won't know if fullscreen failed.

**Fix**: Log error or show user-facing toast notification.

---

### 1.2 Missing Error Handling in Export Functions

#### Location: [src/hooks/useDocumentIO.ts](src/hooks/useDocumentIO.ts#L170-L180)
**Issue**: PDF export via `window.open()` has no error handling:
- If window.open returns null (popup blocked), code silently returns
- No user notification about failure
- No retry mechanism

**Suggested Fix**:
```typescript
const windowRef = window.open("", "_blank");
if (!windowRef) {
  toast.error("Failed to open print window. Please check popup blocker settings.");
  return;
}
```

#### Location: [src/hooks/useDocumentIO.ts](src/hooks/useDocumentIO.ts#L195)
**Issue**: FileReader error handler missing:
```javascript
reader.onload = (loadEvent) => { ... }
// Missing: reader.onerror = () => { ... }
```
File read failures are not handled. User gets no feedback if file reading fails.

---

### 1.3 Unhandled localStorage Errors

#### Location: [src/components/editor/AdvancedColorPicker.tsx](src/components/editor/AdvancedColorPicker.tsx#L20-L33)
```typescript
function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];  // ✓ Good - but silently fails
  }
}

function saveRecentColor(color: string) {
  // Missing try-catch - will throw if localStorage is full
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(...));
}
```

**Issue**: `saveRecentColor()` has no error handling for quota exceeded errors.

#### Location: [src/components/editor/useAutoSave.ts](src/components/editor/useAutoSave.ts#L45-L50)
```typescript
export const saveData = (data: AutoSaveData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(...));
  } catch {
    // storage full or unavailable - silently ignores
  }
};
```

**Issue**: No user warning when autosave fails due to storage quota.

---

### 1.4 Type Coercion in Error Handling

#### Location: [src/components/editor/JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx#L39)
```typescript
} catch (e: any) {
  return { data: undefined, error: e.message || "파싱 에러" };
}
```

**Issue**: Type safety issue with `e: any`. Better approach:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : "파싱 에러";
  return { data: undefined, error: message };
}
```

---

### 1.5 Uncaught Promise Rejections

#### Location: [src/hooks/useDocumentIO.ts](src/hooks/useDocumentIO.ts#L178)
```typescript
const handleSavePdf = useCallback(() => {
  const windowRef = window.open("", "_blank");
  if (!windowRef) return;
  windowRef.document.write(buildPrintHtml(...));
  windowRef.document.close();
  setTimeout(() => windowRef.print(), 500);  // No error handling
}, [...]);
```

**Issue**: If `windoRef.print()` fails (e.g., user cancels), no error is caught.

---

## 2. MEMORY LEAKS & RESOURCE CLEANUP

### 2.1 Debounce Timers Not Always Cleared

#### Location: [src/components/editor/MarkdownEditor.tsx](src/components/editor/MarkdownEditor.tsx#L72-L78)
```typescript
handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
  // ...
  if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
  sourceDebounce.current = setTimeout(() => {
    // ...
  }, 600);
}, [...]);
```

**Issue**: Component unmounts before timeout completes → timer fires on unmounted component.

**Risk**: Memory leak + potential state update warning in React.

**Fix**: Add cleanup in useEffect:
```typescript
useEffect(() => {
  return () => {
    if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
  };
}, []);
```

#### Also Found In:
- [HtmlEditor.tsx](src/components/editor/HtmlEditor.tsx#L62)
- [LatexEditor.tsx](src/components/editor/LatexEditor.tsx#L66)

---

### 2.2 Event Listeners Not Removed (useEditorUiState)

#### Location: [src/hooks/useEditorUiState.ts](src/hooks/useEditorUiState.ts#L64-L94)
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => { ... };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [findReplaceOpen, toggleFullscreen]);  // ✓ Good dependency array
```

**Status**: ✓ This is handled correctly.

---

### 2.3 Dynamic setInterval in useAutoSave

#### Location: [src/components/editor/useAutoSave.ts](src/components/editor/useAutoSave.ts#L48-L57)
```typescript
useEffect(() => {
  if (!data) return;
  const timer = setInterval(() => {
    if (dataRef.current) saveData(dataRef.current);
  }, intervalMs);
  return () => clearInterval(timer);
}, [intervalMs, !!data]);  // Dependency on !!data might be too loose
```

**Status**: ✓ Cleanup is present, but using `!!data` is a code smell (better: `[intervalMs, data !== null]`).

---

## 3. REACT LIFECYCLE & HOOK ISSUES

### 3.1 useEffect with Editor Causes Unnecessary Resets

#### Location: [src/components/editor/MarkdownEditor.tsx](src/components/editor/MarkdownEditor.tsx#L59-L66)
```typescript
useEffect(() => {
  onEditorReady?.(editor);
  return () => {
    onEditorReady?.(null);  // Called every time editor changes!
  };
}, [editor, onEditorReady]);  // editor changes frequently
```

**Issue**: 
- Every editor state change calls `onEditorReady(null)` then `onEditorReady(editor)`
- Parent components may unnecessarily re-render
- Could cause UI flicker if `setActiveEditor` in parent triggers re-renders

**Better Approach**:
```typescript
useEffect(() => {
  onEditorReady?.(editor);
}, [editor, onEditorReady]);
// Only notify when editor truly becomes ready, not on every update
```

#### Also Found In:
- [HtmlEditor.tsx](src/components/editor/HtmlEditor.tsx#L49-L56)
- [LatexEditor.tsx](src/components/editor/LatexEditor.tsx#L44-L51)

---

### 3.2 Overly Broad Dependencies in useEffect

#### Location: [src/components/editor/MarkdownEditor.tsx](src/components/editor/MarkdownEditor.tsx#L34-L37)
```typescript
useEffect(() => {
  onHtmlChange?.(initialHtml);
}, [initialHtml, onHtmlChange]);  // If onHtmlChange changes → effect reruns
```

**Issue**: If parent passes new `onHtmlChange` function on every render, this runs every render.

**Better**: Wrap callback in `useCallback` in parent, or use `useRef` for initial HTML.

---

### 3.3 Missing Dependency in JsonYamlEditor

#### Location: [src/components/editor/JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx#L510-L520) (approximate)
```typescript
useEffect(() => {
  // Updates searchText, but may have missing dependencies
}, [...]); // ⚠️ Need to verify all dependencies
```

---

## 4. INCOMPLETE IMPLEMENTATIONS & EDGE CASES

### 4.1 File Upload Size Not Validated

#### Location: [src/hooks/useDocumentIO.ts](src/hooks/useDocumentIO.ts#L186-L221)
```typescript
const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const content = loadEvent.target?.result as string;
    // No size check!
    // Large files could freeze the editor
  };
  reader.readAsText(file);
}, [createDocument]);
```

**Issue**: 
- No file size limit (could be 1GB+ text file)
- No progress indicator for large files
- Synchronous parsing could freeze UI

**Suggested Fix**:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  toast.error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  return;
}
```

---

### 4.2 No Input Validation on Mode Changes

#### Location: [src/hooks/useFormatConversion.ts](src/hooks/useFormatConversion.ts#L85-L110)
```typescript
const handleModeChange = useCallback((newMode: EditorMode) => {
  const oldMode = activeDoc.mode;
  if (oldMode === newMode) return;
  
  let convertedContent = "";
  try {
    if (newMode === "markdown") {
      convertedContent = turndownService.turndown(currentEditorHtml);
    } else if (newMode === "latex") {
      convertedContent = htmlToLatex(currentEditorHtml, false);
    }
  } catch (error) {
    console.error("Mode conversion error:", error);  // ⚠️ user not notified
    convertedContent = activeDoc.content;
  }
  // ...
}, [...]);
```

**Issue**: Conversion errors shown only in console. Users don't see them.

**Fix**: Use `toast.error()` instead of `console.error()`.

---

### 4.3 Incomplete JSON Schema Validation

#### Location: [src/components/editor/SchemaValidator.tsx](src/components/editor/SchemaValidator.tsx#L50-L75)
```typescript
const validate = useCallback(() => {
  if (!schemaText.trim()) {
    setSchemaError("스키마를 입력하세요.");
    return;
  }
  
  let schema: unknown;
  try {
    schema = JSON.parse(schemaText);
  } catch {
    setSchemaError("스키마 JSON 파싱 오류");
    return;
  }
  
  try {
    const validateFn = ajv.compile(schema as object);
    // ...
  } catch (e: any) {
    setSchemaError(`스키마 컴파일 오류: ${e.message}`);  // ✓ Good error msg
  }
}, [...]);
```

**Status**: ✓ Mostly good, but `schema as object` is unsafe type assertion.

---

### 4.4 No Autosave Failure Notification

#### Location: [src/components/editor/useAutoSave.ts](src/components/editor/useAutoSave.ts#L45-L51)
```typescript
export const saveData = (data: AutoSaveData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastSaved: Date.now() }));
  } catch {
    // storage full or unavailable - user has no idea
  }
};
```

**Issue**: User loses work if localStorage quota exceeded. No warning.

---

## 5. ACCESSIBILITY & UX ISSUES

### 5.1 Missing aria-labels and Role Attributes

#### Location: Multiple button components (e.g., [EditorToolbar.tsx](src/components/editor/EditorToolbar.tsx) lines 30-50)
```typescript
<Toggle size="sm" pressed={false} className="..." title="이미지 삽입">
  <Image className="h-4 w-4" />
</Toggle>
```

**Issue**: 
- No `aria-label` for screen readers
- Title attribute is not read by screen readers
- Icon-only buttons without accessible names

**Fix**:
```typescript
<Toggle size="sm" pressed={false} aria-label="이미지 삽입">
  <Image className="h-4 w-4" />
</Toggle>
```

---

### 5.2 Keyboard Navigation in Complex Components

#### Location: [src/components/editor/JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx)
**Issue**: JSON tree editor lacks keyboard navigation:
- Can't expand/collapse items with keyboard
- Can't navigate with arrow keys
- No tab order hints

---

### 5.3 Low Contrast in Some UI Elements

#### Location: [src/components/editor/DocumentTabs.tsx](src/components/editor/DocumentTabs.tsx#L23-L30)
```typescript
text-muted-foreground hover:text-foreground hover:bg-secondary/50
```

**Issue**: Muted foreground color may have low WCAG contrast ratio in light mode.

---

## 6. PERFORMANCE ISSUES

### 6.1 Inefficient Re-renders in Value Editor

#### Location: [src/components/editor/JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx#L350+)
```typescript
{Object.entries(value as Record<string, JsonValue>).map(([k, v], i) => (
  <ValueEditor
    key={`${path}.${k}.${i}`}  // ⚠️ Using index in key!
    // ...
  />
))}
```

**Issue**: 
- Using array index in key causes React to lose element identity
- Every reorder causes DOM recreation
- Performance degrades with large JSON structures

**Fix**: Use `key={k}` or a stable ID instead of index.

---

### 6.2 Memoization Missing for Complex Components

#### Location: [src/components/editor/ExportPreviewPanel.tsx](src/components/editor/ExportPreviewPanel.tsx)
```typescript
const converted = useMemo(() => {
  try {
    if (editorMode === "latex" && format === "typst") {
      return latexToTypst(rawContent);
    }
    // ... conversion logic
  } catch {
    return "변환 중 오류가 발생했습니다.";
  }
}, [editorHtml, rawContent, editorMode, format]);
```

**Status**: ✓ Correctly memoized, good performance.

---

### 6.3 Multiple Conversions on Mode Change

#### Location: [src/hooks/useFormatConversion.ts](src/hooks/useFormatConversion.ts#L46-L62)
```typescript
const getDocumentHtml = useCallback((mode: EditorMode, content: string) => {
  if (!content) return "";
  if (mode === "markdown") {
    return markedInstance.parse(content, { async: false }) as string;
  }
  // ... multiple conversions
}, [markedInstance]);

useEffect(() => {
  setLiveEditorHtml(getDocumentHtml(activeDoc.mode, activeDoc.content));
}, [activeDoc.content, activeDocId, activeDoc.mode, editorKey, getDocumentHtml]);
```

**Issue**: Conversion runs on every content change. For large documents, this could be slow.

**Suggested**: Add debounce for non-markdown modes.

---

## 7. TYPE SAFETY ISSUES

### 7.1 Unsafe Type Assertions

#### Location: [src/hooks/useDocumentIO.ts](src/hooks/useDocumentIO.ts#L195)
```typescript
const content = loadEvent.target?.result as string;
```

**Issue**: `FileReader.result` can be `string | ArrayBuffer | null`. Unsafe cast.

**Fix**:
```typescript
const content = loadEvent.target?.result;
if (typeof content !== 'string') {
  toast.error("Invalid file format");
  return;
}
```

---

### 7.2 Any Type in Error Handling

#### Location: [src/components/editor/JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx#L39)
```typescript
} catch (e: any) {
  return { data: undefined, error: e.message || "파싱 에러" };
}
```

Also in [SchemaValidator.tsx](src/components/editor/SchemaValidator.tsx#L64):
```typescript
} catch (e: any) {
  setSchemaError(`스키마 컴파일 오류: ${e.message}`);
}
```

**Better**:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return { data: undefined, error: message };
}
```

---

### 7.3 Loose Schema Type in JSON Editor

#### Location: [src/components/editor/JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx#L255+)
```typescript
const schema?: any;  // Should be narrower type
```

---

## 8. TEST COVERAGE GAPS

### Test Files Found:
- [exportConversions.test.ts](src/test/exportConversions.test.ts) - ✓ Good HTML → LaTeX/Typst/RST/AsciiDoc tests
- [htmlToRst.test.ts](src/test/htmlToRst.test.ts) - ✓ Good RST conversion tests
- [latexToTypst.test.ts](src/test/latexToTypst.test.ts) - ✓ Good math conversion tests
- [markdownRoundtrip.test.ts](src/test/markdownRoundtrip.test.ts) - ✓ HTML ↔ MD round-trip tests
- [structuredDataHighlight.test.ts](src/test/structuredDataHighlight.test.ts) - Unknown (need to check)
- [example.test.ts](src/test/example.test.ts) - Unknown

### Major Test Coverage Gaps:

1. **No Hook Tests**: 
   - `useDocumentManager.ts` - No tests
   - `useDocumentIO.ts` - No tests
   - `useFormatConversion.ts` - No tests
   - `useEditorUiState.ts` - No tests

2. **No Component Integration Tests**:
   - Editor components work together but no tests verify this
   - No tests for multi-document workflows
   - No tests for mode switching

3. **No Edge Case Tests**:
   - No tests for file upload limits
   - No tests for localStorage failures
   - No tests for concurrent document edits
   - No tests for very large documents

4. **No Error Recovery Tests**:
   - No tests for corrupted JSON/YAML
   - No tests for failed conversions
   - No tests for network failures

---

## 9. MISSING FEATURES / INCOMPLETE IMPLEMENTATIONS

### 9.1 No Undo/Redo for JSON Editor
The JSON/YAML editor (ValueEditor) allows changes but may not integrate with editor undo/redo.

---

### 9.2 No Conflict Detection for Simultaneous Edits
If two tabs edit the same document, changes aren't merged intelligently.

---

### 9.3 No Autosave Status Indicator
Users don't know if autosave succeeded or failed.

---

### 9.4 Incomplete File Format Support
- No support for importing Markdown with front matter
- RST/AsciiDoc conversion is one-way (import only, not round-trip)

---

## 10. SUMMARY TABLE

| Category | Severity | Count | Examples |
|----------|----------|-------|----------|
| Error Handling | HIGH | 7 | Empty catch, silent failures, no user feedback |
| Memory Leaks | MEDIUM | 3 | Debounce timers, uncleaned refs |
| React Lifecycle | MEDIUM | 5 | Editor reset on every change, loose dependencies |
| Edge Cases | MEDIUM | 4 | No file size limits, no validation |
| Accessibility | MEDIUM | 3 | Missing aria-labels, poor keyboard nav |
| Performance | LOW | 3 | Inefficient keys, multiple conversions |
| Type Safety | LOW | 4 | Any types, unsafe assertions |
| Test Coverage | HIGH | 6+ areas | No hook/integration tests, gaps in error cases |

---

## Recommended Priorities

### 🔴 Critical (Fix First)
1. Add file size validation on upload
2. Show user feedback for failed operations (exports, saves)
3. Fix debounce timer cleanup to prevent memory leaks
4. Add reader.onerror handler for file loading

### 🟡 High (Fix Next Sprint)
1. Add localStorage failure notifications
2. Fix editor reset issue on each state change
3. Add tests for all custom hooks
4. Fix error type safety (`any` → proper Error handling)

### 🟢 Medium (Future)
1. Improve accessibility with aria-labels
2. Optimize JSON editor key rendering
3. Add autosave status indicator
4. Add keyboard navigation to complex components

---

## File-Level Recommendations

| File | Issues | Priority |
|------|--------|----------|
| [useDocumentIO.ts](src/hooks/useDocumentIO.ts) | File size validation, error handling | 🔴 |
| [MarkdownEditor.tsx](src/components/editor/MarkdownEditor.tsx) | Debounce cleanup, editor reset | 🔴 |
| [HtmlEditor.tsx](src/components/editor/HtmlEditor.tsx) | Debounce cleanup, editor reset | 🔴 |
| [LatexEditor.tsx](src/components/editor/LatexEditor.tsx) | Debounce cleanup, editor reset | 🔴 |
| [JsonYamlEditor.tsx](src/components/editor/JsonYamlEditor.tsx) | Array key rendering, type safety | 🟡 |
| [useEditorUiState.ts](src/hooks/useEditorUiState.ts) | Fullscreen error handling | 🟡 |
| [useAutoSave.ts](src/components/editor/useAutoSave.ts) | Storage failure notification | 🟠 |
| [EditorToolbar.tsx](src/components/editor/EditorToolbar.tsx) | Accessibility (aria-labels) | 🟢 |

