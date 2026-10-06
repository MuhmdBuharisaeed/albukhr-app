/* ALBUKHR EXTERNAL PROJECT POLICY CONSENT GATE V1.0
   Insert after js/core/page-auth-guard.js and before external-create.js.
   No LocalStorage/sessionStorage. Server-side acknowledgment is authoritative.
*/
(function(window,document){
  "use strict";
  const state={policy:null,network:null,piUid:null,initialized:false};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");

  function deps(){
    if(!window.ALBukhrEnvironment) throw new Error("ALBUKHR Environment Core is unavailable.");
    if(!window.ALBUKHR_SUPABASE) throw new Error("ALBUKHR Supabase Core is unavailable.");
    if(!window.AlbukhrPageAuthGuard) throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    if(!window.ALBukhrEnvironment.isKnown()) throw new Error("ALBUKHR environment is not recognized.");
  }
  function network(){
    const n=String(window.ALBukhrEnvironment.getNetwork()||"").trim().toLowerCase();
    if(n!=="mainnet"&&n!=="testnet") throw new Error("Invalid ALBUKHR network.");
    return n;
  }
  async function identity(){
    const user=await window.AlbukhrPageAuthGuard.waitForAuth();
    if(!user) throw new Error("Authenticated Pi user is required.");
    const uid=typeof window.AlbukhrPageAuthGuard.getPiUid==="function"?window.AlbukhrPageAuthGuard.getPiUid():null;
    if(!uid) throw new Error("Authenticated Pi UID is unavailable.");
    state.piUid=String(uid).trim();
  }
  async function currentPolicy(){
    const {data,error}=await window.ALBUKHR_SUPABASE.rpc("get_current_external_project_policy");
    if(error) throw error;
    if(!data?.policy_version||!data?.guidance_version) throw new Error("Current External Project Policy configuration is unavailable.");
    state.policy=data;
  }
  function styles(){
    if($("albukhrExternalPolicyConsentStyles")) return;
    const s=document.createElement("style"); s.id="albukhrExternalPolicyConsentStyles";
    s.textContent=`
      .external-policy-consent-gate{margin:0 0 24px;padding:22px;border:1px solid rgba(15,122,61,.20);border-radius:18px;background:rgba(15,122,61,.04)}
      .external-policy-consent-gate h2{margin:0 0 8px}.external-policy-consent-gate p{line-height:1.6}
      .external-policy-consent-docs{display:grid;gap:10px;margin:16px 0}.external-policy-consent-docs a{font-weight:700;text-decoration:none}
      .external-policy-consent-check{display:flex;align-items:flex-start;gap:10px;margin:18px 0;font-weight:600}.external-policy-consent-check input{width:auto;margin-top:4px}
      .external-policy-consent-status{min-height:1.4em;margin-top:10px}.external-policy-consent-status.error{color:#b42318}
    `; document.head.appendChild(s);
  }
  function renderGate(){
    styles();
    const form=$("externalProjectForm");
    if(!form) throw new Error("External Project application form is unavailable.");
    form.hidden=true;
    let gate=$("externalPolicyConsentGate");
    if(!gate){gate=document.createElement("section");gate.id="externalPolicyConsentGate";gate.className="external-policy-consent-gate";form.parentNode.insertBefore(gate,form);}
    const p=state.policy;
    gate.innerHTML=`
      <div class="eyebrow">ALBUKHR EXTERNAL PROJECT GOVERNANCE</div>
      <h2>Policy & Builder Guidance Acknowledgment</h2>
      <p>Before creating or continuing an External Project application, review the current ALBUKHR External Project Policy and Builder Guidance.</p>
      <div class="external-policy-consent-docs">
        <a href="${esc(p.policy_document_path)}" target="_blank" rel="noopener noreferrer">Read External Project Policy v${esc(p.policy_version)}</a>
        <a href="${esc(p.guidance_document_path)}" target="_blank" rel="noopener noreferrer">Read External Project Builder Guidance v${esc(p.guidance_version)}</a>
      </div>
      <p><strong>Current versions:</strong> Policy v${esc(p.policy_version)} • Guidance v${esc(p.guidance_version)} • Network ${esc(state.network.toUpperCase())}</p>
      <label class="external-policy-consent-check"><input id="externalPolicyConsentCheckbox" type="checkbox"><span>I confirm that I have read and understood the current ALBUKHR External Project Policy and Builder Guidance, have authority to submit the project, and agree to comply with the applicable requirements.</span></label>
      <button id="externalPolicyConsentButton" class="primary-action" type="button" disabled>Acknowledge & Continue</button>
      <div id="externalPolicyConsentStatus" class="external-policy-consent-status" aria-live="polite"></div>`;
    const cb=$("externalPolicyConsentCheckbox"),btn=$("externalPolicyConsentButton"),msg=$("externalPolicyConsentStatus");
    cb.addEventListener("change",()=>{btn.disabled=!cb.checked;});
    btn.addEventListener("click",async()=>{
      if(!cb.checked) return;
      btn.disabled=true; btn.textContent="Recording acknowledgment..."; msg.textContent="Recording your acknowledgment securely...";
      try{
        const {data,error}=await window.ALBUKHR_SUPABASE.rpc("gateway_record_external_project_policy_acknowledgment",{p_pi_uid:state.piUid,p_network:state.network});
        if(error) throw error; if(!data) throw new Error("The policy acknowledgment was not accepted by the server.");
        form.hidden=false; gate.hidden=true;
        window.dispatchEvent(new CustomEvent("albukhr:external-project-policy-accepted",{detail:{policyVersion:p.policy_version,guidanceVersion:p.guidance_version,network:state.network,acknowledgmentId:data}}));
      }catch(e){msg.className="external-policy-consent-status error";msg.textContent=e?.message||"Unable to record the policy acknowledgment.";btn.disabled=false;btn.textContent="Acknowledge & Continue";}
    });
  }
  async function init(){
    if(state.initialized)return; state.initialized=true;
    try{deps();state.network=network();await identity();await currentPolicy();renderGate();}
    catch(e){
      console.error("[ALBUKHR EXTERNAL POLICY CONSENT INIT]",e);
      const form=$("externalProjectForm"); if(form) form.hidden=true;
      const gate=document.createElement("section"); gate.className="external-policy-consent-gate";
      gate.innerHTML=`<h2>Policy acknowledgment unavailable</h2><p>The External Project application cannot continue until the current ALBUKHR Policy and Builder Guidance can be verified.</p><p class="external-policy-consent-status error">${esc(e?.message||"Unknown error")}</p>`;
      if(form?.parentNode) form.parentNode.insertBefore(gate,form);
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
  window.ALBukhrExternalProjectPolicyConsent=Object.freeze({getState:()=>Object.freeze({...state})});
})(window,document);
