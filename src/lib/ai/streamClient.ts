export type AIProvider = "gemini" | "groq" | "openrouter" | "deepinfra" | "openai" | "claude" | "deepseek" | "custom";
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type StreamOptions = { messages: ChatMessage[]; provider?: AIProvider; apiKey?: string; model?: string; baseUrl?: string; onChunk: (chunk: string) => void; onError?: (error: Error) => void; onFinish?: () => void; signal?: AbortSignal };
export type ConnectionConfig = { provider: AIProvider; apiKey: string; model: string; baseUrl: string };

const endpoints: Record<Exclude<AIProvider, "gemini" | "claude" | "custom">, string> = {
  groq: "https://api.groq.com/openai/v1", openrouter: "https://openrouter.ai/api/v1",
  deepinfra: "https://api.deepinfra.com/v1/openai", openai: "https://api.openai.com/v1", deepseek: "https://api.deepseek.com/v1",
};
const clinicalSystem = `You are Clinical Aid, a careful medical education and clinical reasoning assistant. Prioritize evidence-based medicine and standard references (e.g., Harrison's, Nelson, Oxford Handbook, WHO, CDC, NICE, and specialty society guidelines where relevant). Clearly distinguish established facts, guideline recommendations, and uncertainty. For clinical questions, organize responses with: concise answer, reasoning/pathophysiology, differential or key alternatives when relevant, investigations, management principles, red flags, and references/source names. Include adult vs pediatric distinctions and units when relevant. Do not fabricate citations, page numbers, or guideline claims; state when exact source verification is unavailable. This is educational decision support, not a substitute for clinician judgment or local protocols. Ask for essential missing clinical context and highlight urgent escalation when appropriate.`;

function messagesWithSystem(messages: ChatMessage[]) {
  const filtered = messages.filter(m => m.role !== "system");
  return [{ role: "system" as const, content: clinicalSystem }, ...messages.filter(m => m.role === "system"), ...filtered];
}
function resolveBase(provider: AIProvider, baseUrl?: string) {
  return (baseUrl?.trim() || (provider !== "custom" && provider !== "gemini" && provider !== "claude" ? endpoints[provider] : provider === "claude" ? "https://api.anthropic.com/v1" : "")).replace(/\/+$/, "");
}
async function responseError(res: Response) {
  let detail = `HTTP ${res.status} ${res.statusText}`;
  try { const body = await res.json(); detail = body?.error?.message || body?.message || detail; } catch {}
  return new Error(detail);
}
async function readSSE(res: Response, onChunk: (s: string)=>void, signal?: AbortSignal) {
  if (!res.ok) throw await responseError(res);
  if (!res.body) throw new Error("Streaming response body is unavailable.");
  const reader = res.body.getReader(), decoder = new TextDecoder(); let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim(); if (!data || data === "[DONE]") continue;
        let parsed: any; try { parsed = JSON.parse(data); } catch { continue; }
        const text = parsed?.choices?.[0]?.delta?.content;
        if (typeof text === "string") onChunk(text);
        else if (Array.isArray(text)) for (const part of text) if (part?.type === "text" && part.text) onChunk(part.text);
      }
    }
  } finally { reader.releaseLock(); }
}
async function streamGeminiActual(cfg: ConnectionConfig, messages: ChatMessage[], onChunk: (s:string)=>void, signal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`;
  const contents = messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  const system = [clinicalSystem,...messages.filter(m=>m.role==="system").map(m=>m.content)].join("\n\n");
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.3}}),signal});
  if(!res.ok) throw await responseError(res); if(!res.body) throw new Error("Streaming response body is unavailable.");
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer="";
  try{while(true){const{value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split(/\r?\n/);buffer=lines.pop()??"";for(const line of lines){if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(!data)continue;try{const json=JSON.parse(data);for(const part of json?.candidates?.[0]?.content?.parts??[])if(part.text)onChunk(part.text);}catch{}}}}finally{reader.releaseLock();}
}
async function streamClaude(cfg: ConnectionConfig, messages: ChatMessage[], onChunk: (s:string)=>void, signal?: AbortSignal) {
  const base=resolveBase("claude",cfg.baseUrl); const system=[clinicalSystem,...messages.filter(m=>m.role==="system").map(m=>m.content)].join("\n\n");
  const res=await fetch(`${base}/messages`,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":cfg.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:cfg.model,max_tokens:4096,stream:true,system,messages:messages.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content}))}),signal});
  if(!res.ok)throw await responseError(res);if(!res.body)throw new Error("Streaming response body is unavailable.");
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer="";
  try{while(true){const{value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split(/\r?\n/);buffer=lines.pop()??"";for(const line of lines){if(!line.startsWith("data:"))continue;try{const d=JSON.parse(line.slice(5).trim());if(d.type==="content_block_delta"&&d.delta?.text)onChunk(d.delta.text);}catch{}}}}finally{reader.releaseLock();}
}
export async function streamMedicalChat(opts: StreamOptions) {
  const provider=opts.provider ?? (typeof localStorage!=="undefined"?(localStorage.getItem("clinical_aid_active_provider") as AIProvider)||"openai":"openai");
  const apiKey=opts.apiKey ?? (typeof localStorage!=="undefined"?localStorage.getItem(`clinical_aid_key_${provider}`)??"":"");
  const model=opts.model ?? (typeof localStorage!=="undefined"?localStorage.getItem(`clinical_aid_model_${provider}`)??"":"");
  const baseUrl=opts.baseUrl ?? (typeof localStorage!=="undefined"?localStorage.getItem(`clinical_aid_base_url_${provider}`)??"":"");
  try {
    if(!apiKey.trim())throw new Error("API key missing. Open Settings and add your provider key.");
    if(!model.trim())throw new Error("Model ID missing. Set a model in provider Settings.");
    const cfg:ConnectionConfig={provider,apiKey,model,baseUrl};
    if(provider==="gemini") await streamGeminiActual(cfg,opts.messages,opts.onChunk,opts.signal);
    else if(provider==="claude") await streamClaude(cfg,opts.messages,opts.onChunk,opts.signal);
    else {
      const base=resolveBase(provider,baseUrl); if(!base)throw new Error("Set a valid custom OpenAI-compatible Base URL.");
      const res=await fetch(`${base}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`,...(provider==="openrouter"?{"HTTP-Referer":typeof location!=="undefined"?location.origin:"","X-Title":"Clinical Aid"}:{})},body:JSON.stringify({model,messages:messagesWithSystem(opts.messages),stream:true,max_tokens:4096}),signal:opts.signal});
      await readSSE(res,opts.onChunk,opts.signal);
    }
    opts.onFinish?.();
  } catch(e) { const err=e instanceof Error?e:new Error(String(e)); opts.onError?.(err); throw err; }
}
export async function testProviderConnection(cfg:ConnectionConfig) {
  if(!cfg.apiKey.trim())throw new Error("API key is required.");
  if(!cfg.model.trim())throw new Error("Model ID is required.");
  if(cfg.provider==="gemini"){
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
    const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:"Reply with OK"}]}],generationConfig:{maxOutputTokens:1}})});
    if(!res.ok)throw await responseError(res);return;
  }
  if(cfg.provider==="claude"){
    const res=await fetch(`${resolveBase("claude",cfg.baseUrl)}/messages`,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":cfg.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:cfg.model,max_tokens:1,messages:[{role:"user",content:"OK"}]})});
    if(!res.ok)throw await responseError(res);return;
  }
  const base=resolveBase(cfg.provider,cfg.baseUrl);if(!base)throw new Error("Custom Base URL is required.");
  const res=await fetch(`${base}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${cfg.apiKey}`},body:JSON.stringify({model:cfg.model,messages:[{role:"user",content:"Reply OK"}],max_tokens:1,stream:false})});
  if(!res.ok)throw await responseError(res);
}
