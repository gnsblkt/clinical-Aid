"use client";

import { useState } from "react";
import { BookOpen, Brain, ChevronDown, CircleHelp, MessageSquarePlus, Settings2, Sparkles, PanelLeftClose, Send, Paperclip } from "lucide-react";

const suggestions = [
  { icon: "🧠", title: "Explain a difficult concept", detail: "Break it down step by step" },
  { icon: "📚", title: "Create high-yield notes", detail: "Organize facts for revision" },
  { icon: "🩺", title: "Clinical reasoning", detail: "Explore a case systematically" },
  { icon: "✍️", title: "Generate practice questions", detail: "Test understanding and recall" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("OpenAI");
  const [model, setModel] = useState("Choose a model");
  const [showProviders, setShowProviders] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [notice, setNotice] = useState("The chat interface is ready. Connect a provider in Settings to enable AI responses.");

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Brain size={21}/></div><div><strong>Clinical Aid</strong><small>STUDY AI</small></div><button className="icon-btn sidebar-collapse" aria-label="Collapse sidebar"><PanelLeftClose size={17}/></button></div>
      <button className="new-chat" onClick={() => {setPrompt("");setNotice("New chat started. Configure a provider to begin.");}}><MessageSquarePlus size={17}/> New chat <span>⌘ K</span></button>
      <div className="side-label">WORKSPACE</div>
      <button className="side-item active"><MessageSquarePlus size={16}/> Chat</button>
      <button className="side-item" onClick={()=>setNotice("Saved chats will appear here once conversation storage is implemented.")}><BookOpen size={16}/> Library</button>
      <button className="side-item" onClick={()=>setNotice("Gems and custom instructions are on the roadmap.")}><Sparkles size={16}/> Gems <span className="soon">Soon</span></button>
      <div className="side-label history-label">RECENT</div><div className="empty-history">Your conversations will appear here.</div>
      <div className="sidebar-bottom"><button className="side-item" onClick={()=>setNotice("Provider settings are planned. Add secrets only through secure server/deployment settings.")}><Settings2 size={16}/> Settings</button><button className="side-item" onClick={()=>setNotice("Help center coming soon.")}><CircleHelp size={16}/> Help & feedback</button><div className="profile"><div className="avatar">CA</div><div><strong>Study workspace</strong><small>Local preview</small></div><span className="dots">•••</span></div></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div className="mobile-brand"><Brain size={18}/> Clinical Aid</div><div className="model-controls"><div className="dropdown-wrap"><button className="select-btn" onClick={()=>setShowProviders(!showProviders)}>{provider}<ChevronDown size={14}/></button>{showProviders&&<div className="dropdown">{["OpenAI","Groq","OpenRouter","Google Gemini","Anthropic Claude","DeepSeek","Mistral","DeepInfra","Custom endpoint"].map(p=><button key={p} onClick={()=>{setProvider(p);setShowProviders(false);}}>{p}</button>)}</div>}</div><div className="dropdown-wrap"><button className="select-btn model-btn" onClick={()=>setShowModels(!showModels)}>{model}<ChevronDown size={14}/></button>{showModels&&<div className="dropdown"><button onClick={()=>{setModel("Select model in Settings");setShowModels(false);}}>Configure models in Settings</button></div>}</div></div><button className="settings-btn" onClick={()=>setNotice("Provider settings will be available in the next implementation step.")}><Settings2 size={17}/> Settings</button></header>
      <div className="content"><div className="welcome"><div className="welcome-icon"><Sparkles size={22}/></div><div className="eyebrow">YOUR AI STUDY WORKSPACE</div><h1>What are we learning<br/><span>today?</span></h1><p>Think deeper. Learn faster. Master more.</p><div className="suggestion-grid">{suggestions.map(s=><button className="suggestion" key={s.title} onClick={()=>setPrompt(s.title+": ")}><span className="suggestion-emoji">{s.icon}</span><span><strong>{s.title}</strong><small>{s.detail}</small></span><span className="arrow">↗</span></button>)}</div></div>
      <div className="notice"><span className="notice-dot"></span>{notice}</div>
      <div className="composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ask anything… explain a topic, analyze a case, or create study notes." rows={3}/><div className="composer-bottom"><button className="attach" onClick={()=>setNotice("File uploads are planned for a later phase.")}><Paperclip size={16}/> Attach</button><div className="composer-actions"><span className="hint">AI can make mistakes. Verify important information.</span><button className="send" disabled={!prompt.trim()} onClick={()=>setNotice("Provider integration is not connected yet. Your prompt is preserved in the input.")}><Send size={16}/></button></div></div></div><footer>Built for focused learning <span>·</span> Independent Study AI Chat</footer></div>
    </section>
  </main>;
}
