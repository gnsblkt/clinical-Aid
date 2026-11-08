export const runtime = "edge";

import { NextRequest } from "next/server";

type Provider = "gemini" | "groq" | "openrouter" | "deepinfra" | "openai" | "claude" | "deepseek" | "custom";
const BASES: Partial<Record<Provider, string>> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  deepinfra: "https://api.deepinfra.com/v1/openai",
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  claude: "https://api.anthropic.com/v1",
};

function safeBase(provider: Provider, value?: string) {
  const base = value?.trim() || BASES[provider];
  if (!base) throw new Error("A valid HTTPS API base URL is required.");
  const url = new URL(base);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || host === "localhost" || host.endsWith(".localhost") ||
      host === "metadata.google.internal" || host === "0.0.0.0" || host === "::1" ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error("Only public HTTPS provider endpoints are allowed.");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { provider, apiKey, baseUrl } = body ?? {};
  const providers: Provider[] = ["gemini", "groq", "openrouter", "deepinfra", "openai", "claude", "deepseek", "custom"];
  if (!providers.includes(provider) || typeof apiKey !== "string" || !apiKey.trim() || apiKey.length > 4096) {
    return Response.json({ error: "A supported provider and API key are required." }, { status: 400 });
  }
  try {
    let url: string;
    const headers: Record<string, string> = {};
    if (provider === "gemini") {
      url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey);
    } else {
      const base = safeBase(provider, baseUrl);
      url = base + "/models";
      if (provider === "claude") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers.Authorization = "Bearer " + apiKey;
        if (provider === "openrouter") {
          headers["HTTP-Referer"] = request.headers.get("origin") || "https://clinical-aid.vercel.app";
          headers["X-Title"] = "Clinical Aid";
        }
      }
    }
    const upstream = await fetch(url, { headers, cache: "no-store", signal: request.signal });
    const raw = await upstream.text();
    if (!upstream.ok) return new Response(raw || JSON.stringify({ error: "Unable to retrieve models." }), {
      status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "no-store" }
    });
    const data = JSON.parse(raw);
    const rows = provider === "gemini" ? data.models || [] : data.data || data.models || [];
    const models = rows.map((m: any) => ({
      id: String(m.id || m.name || "").replace(/^models\//, ""),
      name: String(m.displayName || m.name || m.id || "").replace(/^models\//, "")
    })).filter((m: { id: string }) => m.id && (provider !== "gemini" || !rows.find((r: any) => (r.name || "").endsWith(m.id))?.supportedGenerationMethods || rows.find((r: any) => (r.name || "").endsWith(m.id))?.supportedGenerationMethods?.includes("generateContent")));
    return Response.json({ models }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Model discovery failed." }, { status: 400 });
  }
}