/* ALBUKHR EXTERNAL PROJECT DASHBOARD
 * Mainnet: trusted External Project API adapter.
 * Testnet: existing applicant RPC path retained until a trusted
 * Testnet External Project gateway/schema is provisioned.
 */
(function(window,document){
"use strict";
let user=null,network=null,applications=[],active="all";
const $=id=>document.getElementById(id);
function deps(){if(!window.ALBukhrEnvironment)throw new Error("ALBUKHR Environment Core is unavailable.");if(!window.ALBUKHR_SUPABASE)throw new Error("ALBUKHR Supabase Core is unavailable.");if(!window.AlbukhrPageAuthGuard)throw new Error("ALBUKHR Page Auth Guard is unavailable.");if(!window.ALBukhrExternalProjectApi)throw new Error("ALBUKHR External Project API is unavailable.");if(!window.ALBukhrEnvironment.isKnown())throw new Error("ALBUKHR environment is not recognized.");}
function net(){const n=String(window.ALBukhrEnvironment.getNetwork()||"").trim().toLowerCase();if(!["mainnet","testnet"].includes(n))throw new Error("Invalid ALBUKHR network.");return n;}
function uid(){const v=window.AlbukhrPageAuthGuard?.getPiUid?.()||user?.pi_uid||user?.uid;if(!v)throw new Error("Authenticated Pi user identity is unavailable.");return String(v).trim();}
function norm(v){return String(v||"").trim().toLowerCase().replace(/\s+/g,"_");}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function label(v){const s=norm(v),m={draft:"Draft",submitted:"Submitted",under_review:"Under Review",needs_revision:"Revision Required",revision_requested:"Revision Required",revision:"Revision Required",changes_requested:"Revision Required",approved:"Approved",rejected:"Rejected",converted:"Converted"};return m[s]||s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function editable(v){return["draft","needs_revision"].includes(norm(v));}
function statusClass(v){const s=norm(v);return["needs_revision","revision_requested","revision","changes_requested"].includes(s)?"revision_requested":s||"draft";}
function date(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en",{year:"numeric",month:"short",day:"numeric"}).format(d);}
function funding(v,a){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat("en",{maximumFractionDigits:7}).format(n)+" "+String(a||"PI").toUpperCase():"—";}
function setStatus(m,t){const e=$("dashboardStatus");if(e){e.textContent=String(m||"");e.className="dashboard-status"+(t?" "+t:"");}}
function show(s){$("applicationsLoading")?.toggleAttribute("hidden",s!=="loading");$("emptyState")?.toggleAttribute("hidden",s!=="empty");$("applicationsList")?.toggleAttribute("hidden",s!=="list");$("dashboardError")?.toggleAttribute("hidden",s!=="error");}
function authUI(){const u=user?.username||user?.pi_username||"ALBUKHR User";if($("networkIndicator"))$("networkIndicator").textContent=network.toUpperCase();if($("authUsername"))$("authUsername").textContent=u;if($("authNetwork"))$("authNetwork").textContent="Authenticated with Pi • "+network.toUpperCase();if($("authAvatar"))$("authAvatar").textContent=u.charAt(0).toUpperCase();}
async function testList(){const r=await window.ALBUKHR_SUPABASE.rpc("get_my_external_project_applications",{p_pi_uid:uid(),p_network:network});if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];}
async function load(){const b=$("refreshApplicationsButton");try{show("loading");if(b){b.disabled=true;b.textContent="Loading...";}setStatus("Loading your secure external project applications...");applications=network==="mainnet"?await window.ALBukhrExternalProjectApi.listApplications():await testList();if(!Array.isArray(applications))throw new Error("Invalid application data returned by the server.");applications.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));render();}catch(e){console.error("[ALBUKHR EXTERNAL PROJECT DASHBOARD]",e);if($("dashboardErrorMessage"))$("dashboardErrorMessage").textContent=e?.message||"Unable to load external project applications.";show("error");setStatus(e?.message||"Unable to load applications.","error");}finally{if(b){b.disabled=false;b.textContent="Refresh";}}}
function filtered(){if(active==="all")return applications;if(active==="revision_requested")return applications.filter(a=>["needs_revision","revision_requested","revision","changes_requested"].includes(norm(a.status)));return applications.filter(a=>norm(a.status)===active);}

/* Logo display is presentation-only. It uses the existing trusted Mainnet
   API endpoint and never changes application status, authentication or routing. */
function safeLogoUrl(value){
  try{
    const url=new URL(String(value||""),window.location.href);
    return url.protocol==="https:"||url.protocol==="http:"?url.href:"";
  }catch(_){
    return "";
  }
}
async function decorateCardLogo(app,cardElement){
  if(network!=="mainnet"||typeof window.ALBukhrExternalProjectApi?.getLogo!=="function")return;
  const id=String(app?.id||"").trim();
  if(!id||!cardElement?.isConnected)return;
  const header=cardElement.querySelector(".application-card-header");
  if(!header||header.querySelector(".application-card-logo"))return;
  try{
    const response=await window.ALBukhrExternalProjectApi.getLogo(id);
    const logo=Array.isArray(response)?response[0]:(response?.data||response);
    const src=safeLogoUrl(logo?.logo_url);
    if(!src||!cardElement.isConnected||header.querySelector(".application-card-logo"))return;
    const image=document.createElement("img");
    image.className="application-card-logo";
    image.src=src;
    image.alt=String(app.project_name||"External Project")+" logo";
    image.loading="lazy";
    image.decoding="async";
    image.referrerPolicy="no-referrer";
    image.addEventListener("error",()=>image.remove(),{once:true});
    header.prepend(image);
  }catch(error){
    /* A logo-read failure must not prevent the application card from working. */
    console.warn("[ALBUKHR EXTERNAL PROJECT DASHBOARD] Logo load failed:",error);
  }
}
function summary(){const c={totalApplications:applications.length,draftApplications:applications.filter(a=>norm(a.status)==="draft").length,reviewApplications:applications.filter(a=>["submitted","under_review"].includes(norm(a.status))).length,approvedApplications:applications.filter(a=>norm(a.status)==="approved").length};Object.entries(c).forEach(([id,v])=>{if($(id))$(id).textContent=v;});}
function card(a){const id=String(a.id||""),s=norm(a.status),can=editable(s),e=document.createElement("article");e.className="application-card";e.innerHTML=`<div class="application-card-header"><div class="application-card-main"><h3 class="application-name">${esc(a.project_name||"Unnamed Project")}</h3><div class="application-business">${esc(a.business_name||"Business information unavailable")}</div><span class="application-code">${esc(a.project_code||a.application_code||"—")}</span></div><span class="application-status status-${esc(statusClass(s))}">${esc(label(s))}</span></div><div class="application-meta"><div class="application-meta-item"><span class="application-meta-label">Funding</span><strong class="application-meta-value">${esc(funding(a.funding_required,a.funding_asset))}</strong></div><div class="application-meta-item"><span class="application-meta-label">Duration</span><strong class="application-meta-value">${esc(a.project_duration_days?a.project_duration_days+" days":"—")}</strong></div><div class="application-meta-item"><span class="application-meta-label">Industry</span><strong class="application-meta-value">${esc(a.industry||"—")}</strong></div></div><div class="application-card-footer"><span class="application-date">Created ${esc(date(a.created_at))}</span><div class="application-actions"><button type="button" class="application-action" data-application-id="${esc(id)}">Details</button><button type="button" class="application-action ${can?"primary":""}" data-application-id="${esc(id)}">${can?"Edit":"View"}</button></div></div>`;return e;}
function render(){summary();const list=$("applicationsList"),rows=filtered();if($("applicationCountText"))$("applicationCountText").textContent=`${rows.length} matching application${rows.length===1?"":"s"}.`;document.querySelectorAll(".status-filter").forEach(b=>b.classList.toggle("active",String(b.dataset.status||"all")===active));if(!applications.length){show("empty");setStatus("You have not created any external project applications on "+network.toUpperCase()+".","success");return;}show("list");list.innerHTML="";if(!rows.length){list.innerHTML='<section class="empty-state"><h2>No Matching Applications</h2><p>No application matches the selected status.</p></section>';return;}rows.forEach(a=>{const element=card(a);list.appendChild(element);void decorateCardLogo(a,element);});}
function bind(){$("createProjectButton")?.addEventListener("click",()=>location.assign("external-create.html"));$("emptyCreateProjectButton")?.addEventListener("click",()=>location.assign("external-create.html"));$("refreshApplicationsButton")?.addEventListener("click",load);$("retryApplicationsButton")?.addEventListener("click",load);$("statusFilters")?.addEventListener("click",e=>{const b=e.target.closest(".status-filter");if(!b)return;active=String(b.dataset.status||"all").toLowerCase();render();});$("applicationsList")?.addEventListener("click",e=>{const b=e.target.closest("[data-application-id]");if(b)location.assign("external-project-detail.html?application_id="+encodeURIComponent(b.dataset.applicationId));});}
async function init(){try{deps();network=net();if($("networkIndicator"))$("networkIndicator").textContent=network.toUpperCase();user=await window.AlbukhrPageAuthGuard.waitForAuth();if(!user)return;authUI();bind();await load();}catch(e){console.error(e);if($("dashboardErrorMessage"))$("dashboardErrorMessage").textContent=e?.message||"Application unavailable.";show("error");}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.ALBukhrExternalProjectDashboard=Object.freeze({reload:load});
})(window,document);
