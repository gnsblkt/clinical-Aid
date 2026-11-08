"use client";

import {useMemo,useState} from "react";
import ReactMarkdown,{type Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize,{defaultSchema} from "rehype-sanitize";
import {Download,FileText,FileType,ChevronDown} from "lucide-react";

export type ExportMessage={role:"user"|"assistant";content:string};
const clinicalSchema={...defaultSchema,attributes:{...defaultSchema.attributes,div:[...(((defaultSchema.attributes as any).div as any[])||[]),"className"]}} as any;
function remarkClinicalSections(){return (tree:any)=>{const nodes=tree.children||[];for(let i=0;i<nodes.length;i++){const node=nodes[i];if(node.type!=="heading")continue;const label=(node.children||[]).map((child:any)=>child.value||"").join("").trim().toLowerCase().replace(/\s+/g," ");if(!/^(core concept|high[- ]yield pearls|differentials?|references)$/.test(label))continue;let end=i+1;while(end<nodes.length&&!(nodes[end].type==="heading"&&nodes[end].depth<=node.depth))end++;const grouped=nodes.splice(i,end-i);nodes.splice(i,0,{type:"clinicalSectionCard",data:{hName:"div",hProperties:{className:["clinical-section-card"]}},children:grouped});}};}
const components:Components={
  blockquote:({children})=><blockquote className="clinical-takeaway">{children}</blockquote>,
  h1:({children})=><h1 className="clinical-h1">{children}</h1>,
  h2:({children})=><h2 className="clinical-section-heading">{children}</h2>,
  h3:({children})=><h3 className="clinical-section-pill">{children}</h3>,
  table:({children})=><div className="clinical-table-wrap"><table className="clinical-table">{children}</table></div>,
  thead:({children})=><thead>{children}</thead>,
  tbody:({children})=><tbody>{children}</tbody>,
  a:({href,children})=><a href={href} target="_blank" rel="noreferrer">{children}</a>,
  p:({children})=><p className="clinical-paragraph">{children}</p>,
  ul:({children})=><ul className="clinical-list">{children}</ul>,
  ol:({children})=><ol className="clinical-list">{children}</ol>,
  code:({children,className})=><code className={className}>{children}</code>,
  pre:({children})=><pre className="clinical-code">{children}</pre>,
};
export function AnswerRenderer({content}:{content:string}){
  return <div className="clinical-markdown"><ReactMarkdown remarkPlugins={[remarkGfm,remarkClinicalSections]} rehypePlugins={[rehypeRaw,[rehypeSanitize,clinicalSchema]]} components={components}>{content}</ReactMarkdown></div>;
}

function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));}
function markdownToHtml(md:string){
  const lines=md.split("\n");let out="",inList=false,inTable=false;
  const closeList=()=>{if(inList){out+="</ul>";inList=false;}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/^\s*\|.*\|\s*$/.test(line)){
      closeList();const cells=line.trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
      if(/^\s*\|?\s*:?-{3,}/.test(line))continue;
      const header=!inTable; if(!inTable){out+="<table><thead><tr>";cells.forEach(c=>out+="<th>"+escapeHtml(c)+"</th>");out+="</tr></thead><tbody>";inTable=true;}
      else {out+="<tr>";cells.forEach(c=>out+="<td>"+escapeHtml(c)+"</td>");out+="</tr>";}
      continue;
    } else if(inTable){out+="</tbody></table>";inTable=false;}
    if(!line.trim()){closeList();continue;}
    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    if(heading){closeList();const n=heading[1].length;out+=`<h${n}>${escapeHtml(heading[2])}</h${n}>`;continue;}
    if(/^>\s?/.test(line)){closeList();out+="<blockquote>"+escapeHtml(line.replace(/^>\s?/,""))+"</blockquote>";continue;}
    if(/^[-*+]\s+/.test(line)){if(!inList){out+="<ul>";inList=true;}out+="<li>"+escapeHtml(line.replace(/^[-*+]\s+/,""))+"</li>";continue;}
    closeList();
    const text=escapeHtml(line).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>");
    out+="<p>"+text+"</p>";
  }
  closeList();if(inTable)out+="</tbody></table>";return out;
}
function plainText(md:string){return md.replace(/!\[([^\]]*)\]\([^)]+\)/g,"$1").replace(/\[([^\]]+)\]\(([^)]+)\)/g,"$1 ($2)").replace(/^\s{0,3}#{1,6}\s+/gm,"").replace(/^\s*>\s?/gm,"").replace(/^\s*[-*+]\s+/gm,"• ").replace(/^\s*\d+\.\s+/gm,"• ").replace(/\|/g," ").replace(/^[\s-:]+$/gm,"").replace(/[*_`~]/g,"").replace(/\n{3,}/g,"\n\n").trim();}
function referencesFor(messages:ExportMessage[]){const all=messages.map(m=>m.content).join("\n");return Array.from(new Set(all.match(/https?:\/\/[^\s)\]>]+/g)||[]));}
function combinedMarkdown(messages:ExportMessage[],title:string,stamp:string){
  const refs=referencesFor(messages);
  return `# Clinical Aid - Clinical Summary\n\n${title}\n\nGenerated: ${stamp}\n\n`+messages.map(m=>`## ${m.role==="assistant"?"Clinical Aid":"User"}\n\n${m.content}`).join("\n\n---\n\n")+"\n\n## Source references\n\n"+(refs.length?refs.map(r=>"- "+r).join("\n"):"No external URLs were embedded in the response.");
}
function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function printPdf(html:string,title:string){
  const frame=document.createElement("iframe");frame.setAttribute("aria-hidden","true");frame.style.cssText="position:fixed;width:0;height:0;border:0;right:0;bottom:0";document.body.appendChild(frame);
  const doc=frame.contentDocument;if(!doc){frame.remove();throw new Error("Unable to prepare the print document.");}
  doc.open();doc.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
  @page{size:auto;margin:18mm 17mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;font-size:10.5pt;line-height:1.6;margin:0}
  header{border-bottom:2px solid #dbe4ee;padding-bottom:12px;margin-bottom:22px}header h1{font-size:19pt;margin:0 0 5px;color:#123b35}header p,.meta{font-size:9pt;color:#64748b;margin:0}
  h1{font-size:18pt}h2{font-size:14pt;color:#164e63;margin-top:22px;border-bottom:1px solid #dbe4ee;padding-bottom:5px}h3{font-size:11pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-top:18px}
  p{margin:8px 0}blockquote{margin:12px 0;padding:11px 14px;background:#ecfdf5;border-left:4px solid #10b981;border-radius:0 7px 7px 0;color:#064e3b;font-weight:600}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9pt}th,td{border:1px solid #dbe3ec;padding:7px;text-align:left;vertical-align:top}th{background:#f1f5f9}tr:nth-child(even) td{background:#f8fafc}
  ul,ol{padding-left:22px}code{font-family:monospace;background:#f1f5f9;padding:1px 3px}pre{white-space:pre-wrap;background:#f1f5f9;padding:10px;border-radius:5px}
  a{color:#2563eb;word-break:break-all}.sources{margin-top:22px;padding-top:10px;border-top:1px solid #dbe4ee;font-size:9pt;word-break:break-word}
  </style></head><body><header><h1>Clinical Aid - Clinical Summary</h1><p>${escapeHtml(title)} · Generated ${escapeHtml(new Date().toLocaleString())}</p></header><main>${html}</main></body></html>`);doc.close();
  const cleanup=()=>{frame.remove();};frame.contentWindow?.addEventListener("afterprint",cleanup,{once:true});window.setTimeout(()=>{frame.contentWindow?.focus();frame.contentWindow?.print();window.setTimeout(cleanup,1500);},250);
}
async function exportDocx(messages:ExportMessage[],title:string,stamp:string){
  const {Document,Paragraph,TextRun,HeadingLevel,Table,TableRow,TableCell,WidthType}=await import("docx");
  const children:any[]=[new Paragraph({text:"Clinical Aid - Clinical Summary",heading:HeadingLevel.TITLE}),new Paragraph({children:[new TextRun({text:title,bold:true}),new TextRun({text:"  |  Generated: "+stamp,color:"64748b",size:18})]}),new Paragraph({text:" "})];
  const refs=referencesFor(messages);
  for(const message of messages){
    children.push(new Paragraph({text:message.role==="assistant"?"Clinical Aid":"User",heading:HeadingLevel.HEADING_1}));
    const lines=message.content.split("\n");let tableRows:string[][]=[];
    const flushTable=()=>{if(!tableRows.length)return;const rows=tableRows.filter(row=>!row.every(c=>/^:?-{3,}:?$/.test(c))).map(row=>new TableRow({children:row.map(cell=>new TableCell({width:{size:100/Math.max(1,row.length),type:WidthType.PERCENTAGE},children:[new Paragraph({text:plainText(cell)})]}))}));if(rows.length)children.push(new Table({rows:rows as any,width:{size:100,type:WidthType.PERCENTAGE},columnWidths:[] }));tableRows=[];};
    for(const line of lines){
      if(/^\s*\|.*\|\s*$/.test(line)){tableRows.push(line.trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim()));continue;}
      flushTable();if(!line.trim())continue;
      const h=line.match(/^(#{1,3})\s+(.+)$/);if(h){children.push(new Paragraph({text:plainText(h[2]),heading:h[1].length===1?HeadingLevel.HEADING_1:h[1].length===2?HeadingLevel.HEADING_2:HeadingLevel.HEADING_3}));continue;}
      if(/^>\s?/.test(line)){children.push(new Paragraph({children:[new TextRun({text:plainText(line.replace(/^>\s?/,"")),bold:true,color:"047857"})],bullet:{level:0},spacing:{before:100,after:100}}));continue;}
      if(/^\s*[-*+]\s+/.test(line)){children.push(new Paragraph({text:plainText(line.replace(/^\s*[-*+]\s+/,"")),bullet:{level:0}}));continue;}
      children.push(new Paragraph({text:plainText(line)}));
    }flushTable();children.push(new Paragraph({text:" "}));
  }
  children.push(new Paragraph({text:"Source references",heading:HeadingLevel.HEADING_1}));if(refs.length)refs.forEach(ref=>children.push(new Paragraph({text:ref,bullet:{level:0}})));else children.push(new Paragraph({text:"No external URLs were embedded in the response."}));
  const doc=new Document({sections:[{properties:{page:{margin:{top:900,right:900,bottom:900,left:900}}},children}]});
  const {Packer}=await import("docx");downloadBlob(await Packer.toBlob(doc),`clinical-aid-summary-${new Date().toISOString().slice(0,10)}.docx`);
}
export function ExportMenu({messages,title="Clinical Summary",compact=false}:{messages:ExportMessage[];title?:string;compact?:boolean}){
  const[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
  const stamp=useMemo(()=>new Date().toLocaleString(),[]);
  const markdown=useMemo(()=>combinedMarkdown(messages,title,stamp),[messages,title,stamp]);
  const run=async(format:"pdf"|"docx"|"md"|"txt")=>{
    if(!messages.length||busy)return;setBusy(true);
    try{
      if(format==="md")downloadBlob(new Blob([markdown],{type:"text/markdown;charset=utf-8"}),`clinical-aid-summary-${new Date().toISOString().slice(0,10)}.md`);
      if(format==="txt")downloadBlob(new Blob([plainText(markdown)],{type:"text/plain;charset=utf-8"}),`clinical-aid-summary-${new Date().toISOString().slice(0,10)}.txt`);
      if(format==="pdf"){const refs=referencesFor(messages);const body=messages.map(m=>`<h2>${m.role==="assistant"?"Clinical Aid":"User"}</h2>${markdownToHtml(m.content)}`).join("<hr/>")+`<section class="sources"><strong>Source references</strong>${refs.length?`<ul>${refs.map(r=>`<li><a href="${escapeHtml(r)}">${escapeHtml(r)}</a></li>`).join("")}</ul>`:"<p>No external URLs were embedded in the response.</p>"}</section>`;printPdf(body,title);}
      if(format==="docx")await exportDocx(messages,title,stamp);
      setOpen(false);
    }catch(e){window.alert(e instanceof Error?e.message:"Export failed. Please try again.");}
    finally{setBusy(false);}
  };
  return <div className={`export-menu ${compact?"compact":""}`}><button className="export-trigger" onClick={()=>setOpen(v=>!v)} disabled={!messages.length||busy}><Download size={14}/>{busy?"Preparing…":"Export / Download"}<ChevronDown size={13}/></button>{open&&<div className="export-popover" role="menu"><button onClick={()=>void run("pdf")}><FileType size={15}/> PDF <small>.pdf · Print-ready</small></button><button onClick={()=>void run("docx")}><FileText size={15}/> Word document <small>.docx</small></button><button onClick={()=>void run("md")}><FileText size={15}/> Markdown <small>.md</small></button><button onClick={()=>void run("txt")}><FileText size={15}/> Plain text <small>.txt</small></button></div>}</div>;
}
