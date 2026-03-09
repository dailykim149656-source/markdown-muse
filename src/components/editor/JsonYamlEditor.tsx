import { useState, useCallback, useEffect, useRef } from "react";
import * as yaml from "js-yaml";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import {
  Plus, Trash2, ChevronDown, ChevronRight, ArrowRightLeft,
  Braces, FileJson, FileText, AlertCircle, GripVertical,
  ToggleLeft, Hash, Type, List, Box, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SchemaValidator from "./SchemaValidator";
import StructuredDataHighlightEditor from "./StructuredDataHighlightEditor";
import type { PlainTextFindReplaceAdapter } from "./findReplaceTypes";
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonYamlEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  mode: "json" | "yaml";
  onModeChange: (mode: "json" | "yaml") => void;
  onPlainTextSearchAdapterReady?: (adapter: PlainTextFindReplaceAdapter | null) => void;
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
    return { data: undefined, error: e.message || "Invalid JSON/YAML content." };
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

// Schema field suggestion types
interface SchemaProperty {
  key: string;
  type: string;
  description?: string;
  required?: boolean;
}

// Extract suggested fields from a JSON Schema for a given path
const extractSchemaFields = (schema: any, path: string): SchemaProperty[] => {
  if (!schema) return [];

  // Navigate schema to match current path
  let currentSchema = schema;

  if (path !== "$") {
    const segments = path.replace(/^\$\.?/, "").split(/\.|\[(\d+)\]/).filter(Boolean);
    for (const seg of segments) {
      if (!currentSchema) break;
      if (currentSchema.type === "object" && currentSchema.properties?.[seg]) {
        currentSchema = currentSchema.properties[seg];
      } else if (currentSchema.type === "array" && currentSchema.items) {
        currentSchema = currentSchema.items;
      } else {
        currentSchema = null;
      }
    }
  }

  if (!currentSchema?.properties) return [];

  const required = currentSchema.required || [];
  return Object.entries(currentSchema.properties).map(([key, prop]: [string, any]) => ({
    key,
    type: prop.type || "string",
    description: prop.description,
    required: required.includes(key),
  }));
};

const getDefaultForType = (type: string): JsonValue => {
  switch (type) {
    case "string": return "";
    case "number": case "integer": return 0;
    case "boolean": return false;
    case "array": return [];
    case "object": return {};
    default: return "";
  }
};

// Schema suggest button
interface SchemaSuggestProps {
  existingKeys: string[];
  suggestions: SchemaProperty[];
  onAdd: (key: string, value: JsonValue) => void;
}

const SchemaSuggestButton = ({ existingKeys, suggestions, onAdd }: SchemaSuggestProps) => {
  const available = suggestions.filter(s => !existingKeys.includes(s.key));
  if (available.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 ml-2 py-1 transition-colors">
          <Sparkles className="h-3 w-3" /> Suggest fields ({available.length})
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <ScrollArea className="max-h-48">
          {available.map((field) => (
            <button
              key={field.key}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-secondary/80 transition-colors text-left"
              onClick={() => onAdd(field.key, getDefaultForType(field.type))}
            >
              <span className="shrink-0">{typeIcon(field.type)}</span>
              <span className="font-medium truncate">{field.key}</span>
              {field.required && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-destructive/10 text-destructive shrink-0">required</span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{field.type}</span>
            </button>
          ))}
        </ScrollArea>
        <div className="border-t border-border mt-1 pt-1 px-2">
          <button
            className="w-full text-xs text-primary hover:text-primary/80 py-1 transition-colors"
            onClick={() => {
              available.filter(f => f.required).forEach(f => onAdd(f.key, getDefaultForType(f.type)));
            }}
          >
            Add all required fields
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Value Editor
interface ValueEditorProps {
  value: JsonValue;
  onChange: (v: JsonValue) => void;
  onDelete?: () => void;
  keyName?: string;
  onKeyChange?: (newKey: string) => void;
  depth: number;
  path: string;
  // Drag-and-drop for arrays
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  // Schema
  schema?: any;
}

const ValueEditor = ({ value, onChange, onDelete, keyName, onKeyChange, depth, path, isDraggable, onDragStart, onDragEnd, schema }: ValueEditorProps) => {
  const type = getValueType(value);
  const [collapsed, setCollapsed] = useState(depth > 2);
  const isComplex = type === "object" || type === "array";

  // Drag state for array children
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);

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

  // Array drag handlers
  const handleArrayDragStart = useCallback((index: number) => (e: React.DragEvent) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    (e.currentTarget as HTMLElement).style.opacity = "0.4";
  }, []);

  const handleArrayDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    dragItemIndex.current = null;
    setDragOverIndex(null);
  }, []);

  const handleArrayDragOver = useCallback((index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleArrayDrop = useCallback((targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const sourceIndex = dragItemIndex.current;
    if (sourceIndex === null || sourceIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }
    const arr = [...(value as JsonValue[])];
    const [moved] = arr.splice(sourceIndex, 1);
    arr.splice(targetIndex, 0, moved);
    onChange(arr);
    setDragOverIndex(null);
    dragItemIndex.current = null;
  }, [value, onChange]);

  // Schema suggestions for object children
  const schemaSuggestions = type === "object" && schema
    ? extractSchemaFields(schema, path)
    : [];

  return (
    <div className={`${depth > 0 ? "ml-4 border-l border-border/50 pl-3" : ""}`}>
      <div className="flex items-center gap-1.5 py-1 group min-h-[32px]">
        {/* Drag handle for array items */}
        {isDraggable && (
          <span
            className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="h-3 w-3" />
          </span>
        )}

        {/* Collapse toggle for objects/arrays */}
        {isComplex ? (
          <button onClick={() => setCollapsed(c => !c)} className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary/80 shrink-0">
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        ) : (
          !isDraggable && <span className="w-5 shrink-0" />
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
              schema={schema}
            />
          ))}
          <div className="flex items-center">
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
              <Plus className="h-3 w-3" /> Add key
            </button>
            {schemaSuggestions.length > 0 && (
              <SchemaSuggestButton
                existingKeys={Object.keys(value as Record<string, JsonValue>)}
                suggestions={schemaSuggestions}
                onAdd={(key, val) => {
                  onChange({ ...(value as Record<string, JsonValue>), [key]: val });
                }}
              />
            )}
          </div>
        </div>
      )}

              {/* Children for arrays */}
      {type === "array" && !collapsed && (
        <div className="mt-0.5">
          {(value as JsonValue[]).map((item, i) => (
            <div
              key={`${path}[${i}]`}
              className={`flex items-start transition-all ${
                dragOverIndex === i ? "border-t-2 border-primary" : ""
              }`}
              draggable={false}
              onDragOver={handleArrayDragOver(i)}
              onDrop={handleArrayDrop(i)}
              onDragLeave={() => setDragOverIndex(null)}
            >
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
                  isDraggable
                  onDragStart={handleArrayDragStart(i)}
                  onDragEnd={handleArrayDragEnd}
                  schema={schema}
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
              <Plus className="h-3 w-3" /> Add item
          </button>
        </div>
      )}
    </div>
  );
};

// ??? Main Editor ???
const JsonYamlEditor = ({
  initialContent,
  onContentChange,
  mode,
  onModeChange,
  onPlainTextSearchAdapterReady,
}: JsonYamlEditorProps) => {
  const [source, setSource] = useState(initialContent || "");
  const [data, setData] = useState<JsonValue | undefined>(() => {
    const { data } = parseContent(initialContent, mode);
    return data;
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);
  const suppressSync = useRef(false);
  const [showSchema, setShowSchema] = useState(false);
  const [schemaObj, setSchemaObj] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const sourceRef = useRef(initialContent || "");
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applySourceValue = useCallback((nextSource: string, nextMode: "json" | "yaml" = mode) => {
    sourceRef.current = nextSource;
    setSource(nextSource);
    onContentChange(nextSource);

    const { data: parsed, error } = parseContent(nextSource, nextMode);
    setParseError(error);

    if (parsed !== undefined) {
      suppressSync.current = true;
      setData(parsed);
      requestAnimationFrame(() => { suppressSync.current = false; });
    }
  }, [mode, onContentChange]);

  const focusSourceTextarea = useCallback((selection?: { from: number; to: number }) => {
    const applySelection = () => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();

      if (selection) {
        textarea.setSelectionRange(selection.from, selection.to);
      }
    };

    if (showSource && textareaRef.current) {
      applySelection();
      return;
    }

    setShowSource(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(applySelection);
    });
  }, [showSource]);

  // Source ??Form sync
  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    applySourceValue(e.target.value);
  }, [applySourceValue]);

  // Form ??Source sync
  useEffect(() => {
    if (suppressSync.current || data === undefined) return;
    const newSource = serializeContent(data, mode);
    sourceRef.current = newSource;
    setSource(newSource);
    onContentChange(newSource);
    setParseError(null);
  }, [data, mode, onContentChange]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    const adapter: PlainTextFindReplaceAdapter = {
      focus: () => focusSourceTextarea(),
      getText: () => sourceRef.current,
      setSelection: (from, to) => focusSourceTextarea({ from, to }),
      setSearchState: (nextSearchText, nextCurrentIndex) => {
        setSearchText(nextSearchText);
        setCurrentSearchIndex(nextCurrentIndex);
      },
      updateText: (nextText) => applySourceValue(nextText),
    };

    onPlainTextSearchAdapterReady?.(adapter);

    return () => {
      onPlainTextSearchAdapterReady?.(null);
    };
  }, [applySourceValue, focusSourceTextarea, onPlainTextSearchAdapterReady]);

  // Convert between JSON and YAML
  const handleConvert = useCallback(() => {
    const targetMode = mode === "json" ? "yaml" : "json";
    if (data !== undefined) {
      const newSource = serializeContent(data, targetMode as "json" | "yaml");
      sourceRef.current = newSource;
      setSource(newSource);
      onContentChange(newSource);
      onModeChange(targetMode as "json" | "yaml");
      toast.success(`${mode.toUpperCase()} → ${targetMode.toUpperCase()} converted`);
    } else {
      const { data: parsed, error } = parseContent(source, mode);
      if (parsed !== undefined) {
        const newSource = serializeContent(parsed, targetMode as "json" | "yaml");
        sourceRef.current = newSource;
        setSource(newSource);
        setData(parsed);
        onContentChange(newSource);
        onModeChange(targetMode as "json" | "yaml");
        toast.success(`${mode.toUpperCase()} → ${targetMode.toUpperCase()} converted`);
      } else {
        toast.error(`Conversion failed: ${error}`);
      }
    }
  }, [mode, data, source, onContentChange, onModeChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.defaultPrevented) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = applyMarkdownTabIndent(ta.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey: e.shiftKey,
    });

    applySourceValue(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== ta) {
        ta.focus();
      }
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, [applySourceValue]);

  const handleSourcePanelKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || e.defaultPrevented) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (document.activeElement !== textarea) {
      textarea.focus();
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = applyMarkdownTabIndent(textarea.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey: e.shiftKey,
    });

    applySourceValue(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== textarea) {
        textarea.focus();
      }
      textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, [applySourceValue]);

  const handleInitEmpty = useCallback((type: "object" | "array") => {
    const initial: JsonValue = type === "object" ? {} : [];
    setData(initial);
    const newSource = serializeContent(initial, mode);
    sourceRef.current = newSource;
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
            {mode === "json" ? "Convert to YAML" : "Convert to JSON"}
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
              Source format: {mode.toUpperCase()}
            </span>
          )}
          {!showSchema && data !== undefined && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={() => setShowSchema(true)}>
              Schema
            </Button>
          )}
        </div>

        {/* Schema Validator */}
        {showSchema && data !== undefined && (
          <div className="mb-4">
            <SchemaValidator data={data} onClose={() => { setShowSchema(false); setSchemaObj(null); }} onSchemaChange={setSchemaObj} />
          </div>
        )}

        {/* Empty state */}
        {data === undefined && !parseError && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Braces className="h-10 w-10" />
            <p className="text-sm">No content yet. Please add JSON or YAML data to start.</p>
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
            <p className="text-sm text-center">No data found. Parse source mode before editing.<br />Use the buttons above to initialize.</p>
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
            schema={schemaObj}
          />
        )}
      </div>
    </ScrollArea>
  );

  const sourcePanel = (
    <SourcePanel
      label={`${mode.toUpperCase()} Source`}
      rootRef={sourcePanelRef}
      value={source}
      onChange={handleSourceChange}
      onKeyDown={handleKeyDown}
      onKeyDownCapture={handleKeyDown}
      onPanelKeyDownCapture={handleSourcePanelKeyDownCapture}
      onSwap={() => setSourceLeft(s => !s)}
      onClose={() => setShowSource(false)}
      placeholder={mode === "json" ? '{\n  "key": "value"\n}' : "key: value\nlist:\n  - item1\n  - item2"}
    >
      <StructuredDataHighlightEditor
        currentMatchIndex={currentSearchIndex}
        mode={mode}
        value={source}
        onChange={handleSourceChange}
        onKeyDownCapture={handleKeyDown}
        onKeyDown={handleKeyDown}
        placeholder={mode === "json" ? '{\n  "key": "value"\n}' : "key: value\nlist:\n  - item1\n  - item2"}
        searchText={searchText}
        textareaRef={textareaRef}
      />
    </SourcePanel>
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

