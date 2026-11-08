export type AIProvider = "gemini" | "groq" | "openrouter" | "deepinfra" | "openai" | "claude" | "deepseek" | "custom";
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type StreamOptions = {
  messages: ChatMessage[];
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  onChunk: (chunk: string) => void;
  onError?: (error: Error) => void;
  onFinish?: () => void;
  signal?: AbortSignal;
};
export type ConnectionConfig = { provider: AIProvider; apiKey: string; model: string; baseUrl: string };

function readStored(provider: AIProvider, key: string) {
  return typeof localStorage === "undefined" ? "" : localStorage.getItem("clinical_aid_" + key + "_" + provider) ?? "";
}
async function errorFromResponse(response: Response) {
  let message = "HTTP " + response.status + " " + response.statusText;
  try {
    const data = await response.json();
    message = data?.error?.message || data?.message || message;
  } catch {
    try { message = (await response.text()).slice(0, 1000) || message; } catch { /* keep status */ }
  }
  return new Error(message);
}
function extractText(provider: AIProvider, data: any): string {
  if (provider === "gemini") {
    return (data?.candidates?.[0]?.content?.parts ?? []).map((part: any) => part?.text ?? "").join("");
  }
  if (provider === "claude") {
    return data?.type === "content_block_delta" && data?.delta?.type === "text_delta" ? data.delta.text ?? "" : "";
  }
  const content = data?.choices?.[0]?.delta?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part: any) => part?.text ?? "").join("");
  return "";
}
async function consumeSSE(response: Response, provider: AIProvider, onChunk: (chunk: string) => void, signal?: AbortSignal) {
  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) throw new Error("The AI proxy returned no response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];
  const dispatch = () => {
    if (!dataLines.length) return;
    const data = dataLines.join("\n");
    dataLines = [];
    if (data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data);
      const text = extractText(provider, parsed);
      if (text) onChunk(text);
    } catch {
      // Ignore malformed keep-alive or partial SSE events; the next event remains independent.
    }
  };
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line === "") dispatch();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
    }
    buffer += decoder.decode();
    if (buffer.startsWith("data:")) dataLines.push(buffer.slice(5).trimStart());
    dispatch();
  } finally {
    reader.releaseLock();
  }
}
function configFromOptions(opts: StreamOptions): ConnectionConfig {
  const provider = opts.provider ?? (typeof localStorage !== "undefined"
    ? (localStorage.getItem("clinical_aid_active_provider") as AIProvider) || "openai"
    : "openai");
  const apiKey = opts.apiKey ?? readStored(provider, "key");
  const model = opts.model ?? readStored(provider, "model");
  const baseUrl = opts.baseUrl ?? readStored(provider, "base_url");
  return { provider, apiKey, model, baseUrl };
}
async function proxyRequest(config: ConnectionConfig, messages: ChatMessage[], stream: boolean, signal?: AbortSignal) {
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": stream ? "text/event-stream" : "application/json" },
    body: JSON.stringify({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      messages,
      stream
    }),
    signal,
    cache: "no-store"
  });
}
export async function streamMedicalChat(opts: StreamOptions) {
  try {
    const config = configFromOptions(opts);
    if (!config.apiKey.trim()) throw new Error("API key missing. Open Settings and add your provider key.");
    if (!config.model.trim()) throw new Error("Model ID missing. Set a model in provider Settings.");
    const response = await proxyRequest(config, opts.messages, true, opts.signal);
    await consumeSSE(response, config.provider, opts.onChunk, opts.signal);
    opts.onFinish?.();
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    opts.onError?.(normalized);
    throw normalized;
  }
}
export async function testProviderConnection(config: ConnectionConfig) {
  if (!config.apiKey.trim()) throw new Error("API key is required.");
  if (!config.model.trim()) throw new Error("Model ID is required.");
  const response = await proxyRequest(config, [{ role: "user", content: "Reply with OK." }], false);
  if (!response.ok) throw await errorFromResponse(response);
  // Consume the small response to ensure the provider completed the request.
  await response.arrayBuffer();
}
