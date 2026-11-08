"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, RotateCcw, Trash2, X } from "lucide-react";
import { testProviderConnection, type AIProvider } from "@/lib/ai/streamClient";
export const PROVIDERS:{id:AIProvider;label:string;defaultModel:string;baseUrl:string}[]=[
{id:"gemini",label:"Google Gemini",defaultModel:"gemini-1.5-flash",baseUrl:""},
{id:"groq",label:"Groq",defaultModel:"llama-3.1-8b-instant",baseUrl:"https://api.groq.com/openai/v1"},
{id:"openrouter",label:"OpenRouter",defaultModel:"openai/gpt-4o-mini",baseUrl:"https://openrouter.ai/api/v1"},
{id:"deepinfra",label:"DeepInfra",defaultModel:"meta-llama/Meta-Llama-3.1-8B-Instruct",baseUrl:"https://api.deepinfra.com/v1/openai"},
{id:"openai",label:"OpenAI",defaultModel:"gpt-4o-mini",baseUrl:"https://api.openai.com/v1"},
{id:"claude",label:"Anthropic Claude",defaultModel:"claude-3-5-haiku-latest",baseUrl:"https://api.anthropic.com/v1"},
{id:"deepseek",label:"DeepSeek",defaultModel:"deepseek-chat",baseUrl:"https://api.deepseek.com/v1"},
{id:"custom",label:"Custom Endpoint",defaultModel:"",baseUrl:""}];
export type ProviderSettings={provider:AIProvider;apiKey:string;model:string;baseUrl:string};
const keyFor=(p:AIProvider)=>`clinical_aid_key_${p}`,modelFor=(p:AIProvider)=>`clinical_aid_model_${p}`,urlFor=(p:AIProvider)=>`clinical_aid_base_url_${p}`;
const defaults=(p:AIProvider)=>PROVIDERS.find(x=>x.id===p)!;
export function loadProviderSettings(provider:AIProvider):ProviderSettings{const d=defaults(provider);return{provider,apiKey:localStorage.getItem(keyFor(provider))??"",model:localStorage.getItem(modelFor(provider))??d.defaultModel,baseUrl:localStorage.getItem(urlFor(provider))??d.baseUrl};}
export function saveProviderSettings(s:ProviderSettings){localStorage.setItem(keyFor(s.provider),s.apiKey);localStorage.setItem(modelFor(s.provider),s.model);localStorage.setItem(urlFor(s.provider),s.baseUrl);localStorage.setItem("clinical_aid_active_provider",s.provider);}
export default function AIApiSettings({open,onClose,onSaved}:{open:boolean;onClose:()=>void;onSaved:(s:ProviderSettings)=>void}){
const[provider,setProvider]=useState<AIProvider>("openai"),[apiKey,setApiKey]=useState(""),[model,setModel]=useState(defaults("openai").defaultModel),[baseUrl,setBaseUrl]=useState(defaults("openai").baseUrl),[visible,setVisible]=useState(false),[status,setStatus]=useState<{type:"success"|"error"|"info";message:string}|null>(null),[testing,setTesting]=useState(false);
useEffect(()=>{if(!open)return;const p=(localStorage.getItem("clinical_aid_active_provider") as AIProvider)||"openai";const s=loadProviderSettings(PROVIDERS.some(x=>x.id===p)?p:"openai");setProvider(s.provider);setApiKey(s.apiKey);setModel(s.model);setBaseUrl(s.baseUrl);setStatus(null);},[open]);
if(!open)return null;
const switchProvider=(p:AIProvider)=>{const s=loadProviderSettings(p);setProvider(p);setApiKey(s.apiKey);setModel(s.model);setBaseUrl(s.baseUrl);setStatus(null);};
const current={provider,apiKey,model,baseUrl};
const test=async()=>{if(!apiKey.trim()||!model.trim()){setStatus({type:"error",message:"Enter an API key and model ID first."});return;}setTesting(true);setStatus({type:"info",message:"Testing provider connection…"});try{await testProviderConnection(current);setStatus({type:"success",message:"Connection successful. Credentials and model are accepted."});}catch(e){setStatus({type:"error",message:e instanceof Error?e.message:"Connection failed."});}finally{setTesting(false);}};
const save=()=>{saveProviderSettings(current);onSaved(current);setStatus({type:"success",message:"Settings saved for this provider in this browser."});};
const clear=()=>{localStorage.removeItem(keyFor(provider));setApiKey("");setStatus({type:"info",message:"Saved API key cleared."});};
const reset=()=>{const d=defaults(provider);setModel(d.defaultModel);setBaseUrl(d.baseUrl);setStatus({type:"info",message:"Defaults restored. Save to persist."});};
return <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="settings-modal"><header className="settings-heading"><div><h2 id="settings-title">AI provider settings</h2><p>Connect a model using your own API key.</p></div><button className="icon-btn" aria-label="Close settings" onClick={onClose}><X size={19}/></button></header>
<label className="field-label">Provider</label><select className="settings-input" value={provider} onChange={e=>switchProvider(e.target.value as AIProvider)}>{PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>
<label className="field-label">API key</label><div className="secret-field"><input className="settings-input" type={visible?"text":"password"} autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste API key"/><button className="reveal-btn" type="button" onClick={()=>setVisible(!visible)} aria-label="Toggle key visibility">{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
<label className="field-label">Model ID</label><input className="settings-input" value={model} onChange={e=>setModel(e.target.value)} placeholder="Provider model ID"/>
<label className="field-label">Base URL (custom endpoint / compatible proxy)</label><input className="settings-input" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1"/>
{status&&<div className={`settings-status ${status.type}`}>{status.type==="success"?<CheckCircle2 size={16}/>:status.type==="info"?<LoaderCircle size={16}/>:<X size={16}/>}<span>{status.message}</span></div>}
<div className="settings-warning">API keys are stored in browser localStorage (not encrypted). Avoid shared devices. Browser-based requests may fail if a provider blocks CORS.</div>
<div className="settings-actions"><button className="secondary-btn" onClick={clear}><Trash2 size={15}/> Clear Key</button><button className="secondary-btn" onClick={reset}><RotateCcw size={15}/> Reset Defaults</button><button className="secondary-btn test-btn" disabled={testing} onClick={test}>{testing?<LoaderCircle className="spin" size={15}/>:null}Test Connection</button><button className="primary-btn" onClick={save}>Save settings</button></div></section></div>;}
