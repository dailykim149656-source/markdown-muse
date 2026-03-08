import { useState, useCallback, useMemo, useEffect } from "react";
import Ajv, { ErrorObject } from "ajv";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, ShieldX, ChevronDown, ChevronRight, X, FileJson } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SchemaValidatorProps {
  data: unknown;
  onClose: () => void;
  onSchemaChange?: (schema: any) => void;
}

const SAMPLE_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {
      name: { type: "string", description: "사용자 이름" },
      age: { type: "number", minimum: 0 },
      email: { type: "string", format: "email" },
      tags: { type: "array", items: { type: "string" } },
      address: {
        type: "object",
        properties: {
          city: { type: "string" },
          zip: { type: "string" },
        },
      },
    },
    required: ["name", "email"],
  },
  null,
  2
);

const SchemaValidator = ({ data, onClose, onSchemaChange }: SchemaValidatorProps) => {
  const [schemaText, setSchemaText] = useState("");
  const [errors, setErrors] = useState<ErrorObject[] | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [open, setOpen] = useState(true);

  const ajv = useMemo(() => new Ajv({ allErrors: true, verbose: true }), []);

  // Parse and notify parent of schema changes for autocomplete
  useEffect(() => {
    if (!schemaText.trim()) {
      onSchemaChange?.(null);
      return;
    }
    try {
      const parsed = JSON.parse(schemaText);
      onSchemaChange?.(parsed);
    } catch {
      onSchemaChange?.(null);
    }
  }, [schemaText, onSchemaChange]);

  const validate = useCallback(() => {
    if (!schemaText.trim()) {
      setSchemaError("스키마를 입력하세요.");
      setErrors(null);
      setValidated(false);
      return;
    }

    let schema: unknown;
    try {
      schema = JSON.parse(schemaText);
    } catch {
      setSchemaError("스키마 JSON 파싱 오류");
      setErrors(null);
      setValidated(false);
      return;
    }

    try {
      const validateFn = ajv.compile(schema as object);
      const valid = validateFn(data);
      setSchemaError(null);
      setValidated(true);
      setErrors(valid ? [] : (validateFn.errors as ErrorObject[]) || []);
    } catch (e: any) {
      setSchemaError(`스키마 컴파일 오류: ${e.message}`);
      setErrors(null);
      setValidated(false);
    }
  }, [schemaText, data, ajv]);

  const loadSample = useCallback(() => {
    setSchemaText(SAMPLE_SCHEMA);
    setErrors(null);
    setValidated(false);
    setSchemaError(null);
  }, []);

  const isValid = validated && errors !== null && errors.length === 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg bg-card/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors">
            {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium flex-1">JSON Schema 검증</span>
            {validated && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isValid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                {isValid ? "통과" : `${errors?.length}개 오류`}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={loadSample}>
                <FileJson className="h-3 w-3" /> 샘플 불러오기
              </Button>
            </div>

            <textarea
              value={schemaText}
              onChange={(e) => { setSchemaText(e.target.value); setValidated(false); }}
              placeholder='{ "type": "object", "properties": { ... } }'
              className="w-full h-32 text-xs font-mono bg-secondary/30 border border-border rounded-md p-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              spellCheck={false}
            />

            <Button size="sm" className="h-7 text-xs gap-1.5 w-full" onClick={validate} disabled={data === undefined}>
              <ShieldCheck className="h-3.5 w-3.5" /> 검증 실행
            </Button>

            {schemaError && (
              <div className="text-xs text-destructive bg-destructive/5 rounded-md p-2 border border-destructive/20">
                {schemaError}
              </div>
            )}

            {validated && errors !== null && (
              <ScrollArea className="max-h-40">
                {isValid ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-md p-2 border border-emerald-500/20">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    데이터가 스키마에 유효합니다.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/5 rounded-md p-2 border border-destructive/20">
                        <ShieldX className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono text-[10px] text-muted-foreground">{err.instancePath || "/"}</span>
                          <span className="ml-1">{err.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default SchemaValidator;
