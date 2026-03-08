import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import * as yaml from "js-yaml";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import {
  Plus, Trash2, ChevronDown, ChevronRight, ArrowRightLeft,
  Braces, FileJson, FileText, AlertCircle, GripVertical,
  ToggleLeft, Hash, Type, List, Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import SchemaValidator from "./SchemaValidator";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonYamlEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  mode: "json" | "yaml";
  onModeChange: (mode: "json" | "yaml") => void;
}

// Parse content to object
const parseContent = (content: string, mode: "json" | "yaml"): { data: JsonValue | undefined; error: string | null } => {
  if (!content.trim()) return { data: undefined, error: null };
  try {
    if (mode === "json") {
      return { data: JSON.parse(content), error: null };
    } else {
      const result = yaml.load(content);
      return { data: result as JsonValue, error: null };
    }
  } catch (e: any) {
    return { data: undefined, error: e.message || "파싱 에러" };
  }
};

// Serialize object to string
const serializeContent = (data: JsonValue, mode: "json" | "yaml"): string => {
  if (mode === "json") {
    return JSON.stringify(data, null, 2);
  }
  return yaml.dump(data, { indent: 2, lineWidth: 120, noRefs: true });
};

// Detect value type
const getValueType = (value: JsonValue): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const typeIcon = (type: string) => {
  switch (type) {
    case "string": return <Type className="h-3 w-3 text-emerald-500" />;
    case "number": return <Hash className="h-3 w-3 text-blue-500" />;
    case "boolean": return <ToggleLeft className="h-3 w-3 text-amber-500" />;
    case "null": return <Box className="h-3 w-3 text-muted-foreground" />;
    case "array": return <List className="h-3 w-3 text-violet-500" />;
    case "object": return <Braces className="h-3 w-3 text-orange-500" />;
    default: return <Type className="h-3 w-3" />;
  }
};

// ─── Value Editor ───
interface ValueEditorProps {
  value: JsonValue;
  onChange: (v: JsonValue) => void;
  onDelete?: () => void;
  keyName?: string;
  onKeyChange?: (newKey: string) => void;
  depth: number;
  path: string;
}

const ValueEditor = ({ value, onChange, onDelete, keyName, onKeyChange, depth, path }: ValueEditorProps) => {
  const type = getValueType(value);
  const [collapsed, setCollapsed] = useState(depth > 2);
  const isComplex = type === "object" || type === "array";

  const changeType = useCallback((newType: string) => {
    switch (newType) {
      case "string": onChange(""); break;
      case "number": onChange(0); break;
      case "boolean": onChange(false); break;
      case "null": onChange(null); break;
      case "array": onChange([]); break;
      case "object": onChange({}); break;
    }
  }, [onChange]);

  return (
    <div className={`${depth > 0 ? "ml-4 border-l border-border/50 pl-3" : ""}`}>
      <div className="flex items-center gap-1.5 py-1 group min-h-[32px]">
        {/* Collapse toggle for objects/arrays */}
        {isComplex ? (
          <button onClick={() => setCollapsed(c => !c)} className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary/80 shrink-0">
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Type icon */}
        <span className="shrink-0">{typeIcon(type)}</span>

        {/* Key name */}
        {keyName !== undefined && onKeyChange && (
          <>
            <Input
              value={keyName}
              onChange={(e) => onKeyChange(e.target.value)}
              className="h-6 w-28 text-xs font-medium bg-secondary/50 border-transparent focus:border-primary px-1.5"
              placeholder="key"
            />
            <span className="text-muted-foreground text-xs">:</span>
          </>
        )}

        {/* Inline value for primitives */}
        {type === "string" && (
          <Input
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="h-6 flex-1 text-xs bg-transparent border-transparent focus:border-primary px-1.5 text-emerald-600 dark:text-emerald-400"
            placeholder='""'
          />
        )}
        {type === "number" && (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-6 w-28 text-xs bg-transparent border-transparent focus:border-primary px-1.5 text-blue-600 dark:text-blue-400"
          />
        )}
        {type === "boolean" && (
          <div className="flex items-center gap-1.5">
            <Switch
              checked={value as boolean}
              onCheckedChange={(v) => onChange(v)}
              className="scale-75"
            />
            <span className="text-xs text-amber-600 dark:text-amber-400">{String(value)}</span>
          </div>
        )}
        {type === "null" && (
          <span className="text-xs text-muted-foreground italic">null</span>
        )}
        {type === "object" && (
          <span className="text-xs text-muted-foreground">{`{ ${Object.keys(value as object).length} }`}</span>
        )}
        {type === "array" && (
          <span className="text-xs text-muted-foreground">{`[ ${(value as JsonValue[]).length} ]`}</span>
        )}

        {/* Type selector */}
        <Select value={type} onValueChange={changeType}>
          <SelectTrigger className="h-5 w-16 text-[10px] border-transparent opacity-0 group-hover:opacity-100 transition-opacity px-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string" className="text-xs">String</SelectItem>
            <SelectItem value="number" className="text-xs">Number</SelectItem>
            <SelectItem value="boolean" className="text-xs">Boolean</SelectItem>
            <SelectItem value="null" className="text-xs">Null</SelectItem>
            <SelectItem value="object" className="text-xs">Object</SelectItem>
            <SelectItem value="array" className="text-xs">Array</SelectItem>
          </SelectContent>
        </Select>

        {/* Delete */}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Children for objects */}
      {type === "object" && !collapsed && (
        <div className="mt-0.5">
          {Object.entries(value as Record<string, JsonValue>).map(([k, v], i) => (
            <ValueEditor
              key={`${path}.${k}.${i}`}
              value={v}
              keyName={k}
              onKeyChange={(newKey) => {
                const obj = { ...(value as Record<string, JsonValue>) };
                const entries = Object.entries(obj);
                const idx = entries.findIndex(([ek]) => ek === k);
                if (idx >= 0) {
                  entries[idx] = [newKey, v];
                  onChange(Object.fromEntries(entries));
                }
              }}
              onChange={(newVal) => {
                onChange({ ...(value as Record<string, JsonValue>), [k]: newVal });
              }}
              onDelete={() => {
                const obj = { ...(value as Record<string, JsonValue>) };
                delete obj[k];
                onChange(obj);
              }}
              depth={depth + 1}
              path={`${path}.${k}`}
            />
          ))}
          <button
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 ml-9 py-1 transition-colors"
            onClick={() => {
              const obj = value as Record<string, JsonValue>;
              let newKey = "newKey";
              let i = 1;
              while (newKey in obj) { newKey = `newKey${i++}`; }
              onChange({ ...obj, [newKey]: "" });
            }}
          >
            <Plus className="h-3 w-3" /> 필드 추가
          </button>
        </div>
      )}

      {/* Children for arrays */}
      {type === "array" && !collapsed && (
        <div className="mt-0.5">
          {(value as JsonValue[]).map((item, i) => (
            <div key={`${path}[${i}]`} className="flex items-start">
              <span className="text-[10px] text-muted-foreground w-5 text-right mr-1 mt-2 shrink-0">{i}</span>
              <div className="flex-1">
                <ValueEditor
                  value={item}
                  onChange={(newVal) => {
                    const arr = [...(value as JsonValue[])];
                    arr[i] = newVal;
                    onChange(arr);
                  }}
                  onDelete={() => {
                    const arr = [...(value as JsonValue[])];
                    arr.splice(i, 1);
                    onChange(arr);
                  }}
                  depth={depth + 1}
                  path={`${path}[${i}]`}
                />
              </div>
            </div>
          ))}
          <button
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 ml-9 py-1 transition-colors"
            onClick={() => {
              onChange([...(value as JsonValue[]), ""]);
            }}
          >
            <Plus className="h-3 w-3" /> 항목 추가
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Editor ───
const JsonYamlEditor = ({ initialContent, onContentChange, mode, onModeChange }: JsonYamlEditorProps) => {
  const [source, setSource] = useState(initialContent || "");
  const [data, setData] = useState<JsonValue | undefined>(() => {
    const { data } = parseContent(initialContent, mode);
    return data;
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);
  const suppressSync = useRef(false);

  // Source → Form sync
  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSource(val);
    onContentChange(val);
    const { data: parsed, error } = parseContent(val, mode);
    setParseError(error);
    if (parsed !== undefined) {
      suppressSync.current = true;
      setData(parsed);
      requestAnimationFrame(() => { suppressSync.current = false; });
    }
  }, [mode, onContentChange]);

  // Form → Source sync
  useEffect(() => {
    if (suppressSync.current || data === undefined) return;
    const newSource = serializeContent(data, mode);
    setSource(newSource);
    onContentChange(newSource);
    setParseError(null);
  }, [data, mode]);

  // Convert between JSON ↔ YAML
  const handleConvert = useCallback(() => {
    const targetMode = mode === "json" ? "yaml" : "json";
    if (data !== undefined) {
      const newSource = serializeContent(data, targetMode as "json" | "yaml");
      setSource(newSource);
      onContentChange(newSource);
      onModeChange(targetMode as "json" | "yaml");
      toast.success(`${mode.toUpperCase()} → ${targetMode.toUpperCase()} 변환 완료`);
    } else {
      // Try parse current source first
      const { data: parsed, error } = parseContent(source, mode);
      if (parsed !== undefined) {
        const newSource = serializeContent(parsed, targetMode as "json" | "yaml");
        setSource(newSource);
        setData(parsed);
        onContentChange(newSource);
        onModeChange(targetMode as "json" | "yaml");
        toast.success(`${mode.toUpperCase()} → ${targetMode.toUpperCase()} 변환 완료`);
      } else {
        toast.error(`변환 실패: ${error}`);
      }
    }
  }, [mode, data, source, onContentChange, onModeChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const indent = mode === "yaml" ? "  " : "  ";
      const newVal = ta.value.substring(0, start) + indent + ta.value.substring(end);
      setSource(newVal);
      onContentChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + indent.length;
      });
    }
  }, [mode, onContentChange]);

  const handleInitEmpty = useCallback((type: "object" | "array") => {
    const initial: JsonValue = type === "object" ? {} : [];
    setData(initial);
    const newSource = serializeContent(initial, mode);
    setSource(newSource);
    onContentChange(newSource);
  }, [mode, onContentChange]);

  // Form content
  const formContent = (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Convert button */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleConvert}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {mode === "json" ? "YAML로 변환" : "JSON으로 변환"}
          </Button>
          {parseError && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[300px]">{parseError}</span>
            </div>
          )}
          {!parseError && data !== undefined && (
            <span className="text-xs text-muted-foreground">
              {mode === "json" ? <FileJson className="h-3.5 w-3.5 inline mr-1" /> : <FileText className="h-3.5 w-3.5 inline mr-1" />}
              유효한 {mode.toUpperCase()}
            </span>
          )}
        </div>

        {/* Empty state */}
        {data === undefined && !parseError && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Braces className="h-10 w-10" />
            <p className="text-sm">빈 문서입니다. 시작할 루트 타입을 선택하세요.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleInitEmpty("object")}>
                <Braces className="h-4 w-4" /> Object {"{}"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleInitEmpty("array")}>
                <List className="h-4 w-4" /> Array {"[]"}
              </Button>
            </div>
          </div>
        )}

        {/* Error state with source-only editing */}
        {parseError && data === undefined && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-center">소스에 구문 오류가 있습니다.<br />소스 패널에서 직접 수정하세요.</p>
            <p className="text-xs text-destructive max-w-md text-center break-words">{parseError}</p>
          </div>
        )}

        {/* Form editor */}
        {data !== undefined && (
          <ValueEditor
            value={data}
            onChange={(v) => setData(v)}
            depth={0}
            path="$"
          />
        )}
      </div>
    </ScrollArea>
  );

  const sourcePanel = (
    <SourcePanel
      label={`${mode.toUpperCase()} 소스`}
      value={source}
      onChange={handleSourceChange}
      onKeyDown={handleKeyDown}
      onSwap={() => setSourceLeft(s => !s)}
      onClose={() => setShowSource(false)}
      placeholder={mode === "json" ? '{\n  "key": "value"\n}' : "key: value\nlist:\n  - item1\n  - item2"}
    />
  );

  return (
    <div className="h-full flex flex-col">
      <SplitEditorLayout
        showPanel={showSource}
        sourceLeft={sourceLeft}
        onShowPanel={setShowSource}
        editorContent={formContent}
        sourcePanel={sourcePanel}
      />
    </div>
  );
};

export default JsonYamlEditor;
