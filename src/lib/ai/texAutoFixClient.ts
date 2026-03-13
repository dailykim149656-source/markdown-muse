import type { TexAutoFixRequest, TexAutoFixResponse } from "@/types/tex";
import { postJson, type RequestOptions } from "@/lib/ai/httpClient";

export const fixTexCompileError = (request: TexAutoFixRequest, options?: RequestOptions) =>
  postJson<TexAutoFixResponse, TexAutoFixRequest>("/api/ai/tex/fix", request, options);
