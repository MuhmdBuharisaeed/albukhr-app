/* ALBUKHR — Contributor Internal Dashboard V2
 *
 * Flow:
 *   Project facts -> Funding Plan -> Server Assessment -> Admin-approved liquidity
 *   -> server-computed remaining gap -> Pi settlement
 *
 * Security rules:
 *   - Mainnet only.
 *   - No LocalStorage/sessionStorage.
 *   - Browser never chooses an approved liquidity amount.
 *   - Contributor-declared liquidity/capital is clearly treated as input context.
 *   - Final settlement amount is read from the trusted API workspace.
 */
(function(window){
  "use strict";

  const MAINNET = "mainnet";
  const ENGINE = "CONTRIBUTOR_INTERNAL_LIQUIDITY_V1";
  const WORKSPACE_API = "/api/contributor/workspace";
  const FUNDING_PLAN_API = "/api/contributor/project/funding-plan";
  const FUNDING_SUBMIT_API = "/api/contributor/project/funding-plan/submit";
  const LIQUIDITY_WORKSPACE_API = "/api/internal-liquidity-workspace";
  const LIQUIDITY_HISTORY_API = "/api/internal-liquidity-history";
  const LIQUIDITY_APPROVE_API = "/api/internal-liquidity-approve";
  const LIQUIDITY_COMPLETE_API = "/api/internal-liquidity-complete";
  const ALLOWED_FUNDING_MODES = new Set(["startup","expansion","working_capital","replacement","mixed"]);

  let currentUser = null;
  let contributorWorkspace = null;
  let project = null;
  let liquidityWorkspace = null;
  let fundingWorkspace = null;
  let paymentInProgress = false;

  const $ = (id) => document.getElementById(id);
  const text = (id, value) => { const el=$(id); if(el) el.textContent = value == null ? "—" : String(value); };
  const show = (id, visible) => { const el=$(id); if(el) el.classList.toggle("hidden", !visible); };

  function errorMessage(error, fallback){
    if(error instanceof Error && error.message) return error.message;
    if(error?.message) return String(error.message);
    if(error?.error?.message) return String(error.error.message);
    return fallback || "Request failed.";
  }

  function numberValue(value){ const n=Number(value); return Number.isFinite(n) ? n : 0; }
  function formatPi(value){ return `${numberValue(value).toFixed(3)} Pi`; }
  function formatDate(value){ if(!value) return "—"; const d=new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(); }
  function mask(value,start=6,end=5){ const v=String(value||"").trim(); if(!v) return "Not configured"; if(v.length<=start+end+3) return "••••••"; return `${v.slice(0,start)}••••••${v.slice(-end)}`; }
  function api(){ if(!window.AlbukhrApi || typeof window.AlbukhrApi.get!=="function") throw new Error("ALBUKHR API Core is unavailable."); return window.AlbukhrApi; }

  function assertMainnet(){
    const network=String(currentUser?.network||window.AlbukhrPiAuth?.getNetwork?.()||window.ALBukhrEnvironment?.getNetwork?.()||"").trim().toLowerCase();
    if(network!==MAINNET) throw new Error("Contributor Internal Dashboard is available on Mainnet only.");
  }

  function setPageStatus(message,kind="info"){
    text("pageStatus",message||"");
    const el=$("securityState");
    if(!el) return;
    el.textContent=kind==="error"?"ACCESS / SERVICE ERROR":"SECURE · MAINNET";
    el.classList.toggle("danger",kind==="error");
  }

  function showError(message){ text("errorText",message||"Unknown dashboard error."); show("errorPanel",true); setPageStatus(message,"error"); }
  function clearError(){ show("errorPanel",false); }

  function renderProject(p){
    project=p||null;
    text("projectName",p?.name||"Internal Project");
    text("projectCode",p?.project_code||"—");
    text("projectStatus",String(p?.status||"unknown").toUpperCase());
    text("userHandle",currentUser?.username||"Contributor");
    const statusEl=$("projectStatus");
    if(statusEl){ statusEl.classList.remove("approved","active","draft","danger"); statusEl.classList.add(String(p?.status||"").toLowerCase()); }
    const logo=$("projectLogo");
    if(logo && String(p?.logo_url||"").trim()) logo.src=String(p.logo_url).trim();
  }

  function toDatetimeLocal(value){
    if(!value) return "";
    const d=new Date(value); if(Number.isNaN(d.getTime())) return "";
    const pad=(n)=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function setInput(id,value){ const el=$(id); if(el) el.value=value==null?"":String(value); }

  function fundingPayloadSource(){
    const raw=fundingWorkspace?.funding_plan || fundingWorkspace || {};
    return raw?.funding_plan || raw;
  }

  function assessmentSource(){
    const raw=fundingWorkspace?.funding_plan || fundingWorkspace || {};
    return raw?.assessment || fundingWorkspace?.assessment || null;
  }

  function fundingItemsSource(){
    const raw=fundingWorkspace?.funding_plan || fundingWorkspace || {};
    return Array.isArray(raw?.items) ? raw.items : (Array.isArray(fundingWorkspace?.items) ? fundingWorkspace.items : []);
  }

  function clearFundingItems(){ const el=$("fundingItems"); if(el) el.replaceChildren(); }

  function makeField(labelText, className, type, value, attrs){
    const wrapper=document.createElement("div"); wrapper.className=className||"item-field";
    const label=document.createElement("label"); label.textContent=labelText; wrapper.appendChild(label);
    const input=document.createElement("input"); input.type=type; input.value=value==null?"":String(value); Object.entries(attrs||{}).forEach(([k,v])=>input.setAttribute(k,v)); wrapper.appendChild(input);
    return {wrapper,input};
  }

  function renderFundingItem(item={},index){
    const row=document.createElement("article"); row.className="funding-item-row"; row.dataset.index=String(index);
    const head=document.createElement("div"); head.className="funding-item-row-head";
    const title=document.createElement("strong"); title.textContent=`Cost line ${index+1}`;
    const remove=document.createElement("button"); remove.type="button"; remove.className="small-button danger-button"; remove.innerHTML='<i class="fa-solid fa-trash"></i><span>Remove</span>'; remove.disabled=index===0;
    remove.addEventListener("click",()=>{ row.remove(); renumberFundingItems(); calculateFundingTotal(); });
    head.append(title,remove); row.appendChild(head);

    const grid=document.createElement("div"); grid.className="funding-item-grid";
    const category=makeField("Category","item-field","text",item.category,{maxlength:"100",required:"required",placeholder:"Equipment / stock / rent"});
    const description=makeField("Description","item-field","text",item.description,{maxlength:"500",required:"required",placeholder:"What will be purchased?"});
    const quantity=makeField("Quantity","item-field","number",item.quantity,{min:"0.001",step:"0.001",inputmode:"decimal",required:"required",placeholder:"1"});
    const unit=makeField("Unit","item-field","text",item.unit||"unit",{maxlength:"50",required:"required",placeholder:"unit / month / machine"});
    const unitCost=makeField("Unit Cost (Pi)","item-field","number",item.unit_cost,{min:"0",step:"0.001",inputmode:"decimal",required:"required",placeholder:"0.000"});
    const stage=makeField("Deployment Stage","item-field","text",item.deployment_stage||"",{maxlength:"100",placeholder:"Phase 1"});
    const notes=makeField("Line Notes","item-field full","text",item.notes||"",{maxlength:"1000",placeholder:"Optional"});
    [category,description,quantity,unit,unitCost,stage,notes].forEach(x=>grid.appendChild(x.wrapper)); row.appendChild(grid);
    row._inputs={category:category.input,description:description.input,quantity:quantity.input,unit:unit.input,unitCost:unitCost.input,stage:stage.input,notes:notes.input};
    [quantity.input,unitCost.input].forEach(input=>input.addEventListener("input",calculateFundingTotal));
    return row;
  }

  function renderFundingItems(items){
    clearFundingItems();
    const list=Array.isArray(items)&&items.length?items:[{}];
    list.forEach((item,index)=>$("fundingItems")?.appendChild(renderFundingItem(item,index)));
    calculateFundingTotal();
  }

  function renumberFundingItems(){
    const rows=[...document.querySelectorAll("#fundingItems .funding-item-row")];
    rows.forEach((row,index)=>{ row.dataset.index=String(index); const title=row.querySelector(".funding-item-row-head strong"); if(title) title.textContent=`Cost line ${index+1}`; const remove=row.querySelector(".danger-button"); if(remove) remove.disabled=index===0; });
  }

  function calculateFundingTotal(){
    let total=0;
    document.querySelectorAll("#fundingItems .funding-item-row").forEach(row=>{ const q=Number(row._inputs?.quantity?.value); const c=Number(row._inputs?.unitCost?.value); if(Number.isFinite(q)&&q>0&&Number.isFinite(c)&&c>=0) total+=q*c; });
    text("fundingItemsTotal",formatPi(total));
    return total;
  }

  function collectItems(){
    const rows=[...document.querySelectorAll("#fundingItems .funding-item-row")];
    if(!rows.length) throw new Error("At least one funding cost line is required.");
    return rows.map((row,index)=>{
      const i=row._inputs||{};
      const category=String(i.category?.value||"").trim(); const description=String(i.description?.value||"").trim(); const quantity=Number(i.quantity?.value); const unit=String(i.unit?.value||"").trim()||"unit"; const unitCost=Number(i.unitCost?.value);
      if(!category||!description) throw new Error(`Cost line ${index+1} requires a category and description.`);
      if(!Number.isFinite(quantity)||quantity<=0) throw new Error(`Cost line ${index+1} quantity is invalid.`);
      if(!Number.isFinite(unitCost)||unitCost<0) throw new Error(`Cost line ${index+1} unit cost is invalid.`);
      return {category,description,quantity,unit,unit_cost:unitCost,deployment_stage:String(i.stage?.value||"").trim()||null,notes:String(i.notes?.value||"").trim()||null};
    });
  }

  function optionalNumberInput(id,label){
    const raw=String($(id)?.value||"").trim();
    if(!raw) return null;
    const n=Number(raw);
    if(!Number.isFinite(n)||n<0||n>1_000_000_000) throw new Error(`${label} is invalid.`);
    return n;
  }

  function optionalIntegerInput(id,label){
    const raw=String($(id)?.value||"").trim(); if(!raw) return null;
    const n=Number(raw); if(!Number.isInteger(n)||n<1||n>3650) throw new Error(`${label} is invalid.`); return n;
  }

  function collectFundingPayload(){
    const businessStage=String($("businessStage")?.value||"").trim();
    const fundingPurpose=String($("fundingPurpose")?.value||"").trim();
    const fundingMode=String($("fundingMode")?.value||"").trim().toLowerCase();
    if(!businessStage) throw new Error("Business Stage is required.");
    if(!fundingPurpose) throw new Error("Funding Purpose is required.");
    if(!ALLOWED_FUNDING_MODES.has(fundingMode)) throw new Error("Funding Mode is invalid.");

    const assetRaw=String($("existingAssetBase")?.value||"").trim();
    const existingAssetBase=assetRaw?optionalNumberInput("existingAssetBase","Existing Asset Base"):null;
    if(fundingMode!=="startup" && existingAssetBase===null) throw new Error("Existing Asset Base is required for a non-startup funding mode.");

    const startRaw=String($("fundingWindowStart")?.value||"").trim();
    const endRaw=String($("fundingWindowEnd")?.value||"").trim();
    const start=startRaw?new Date(startRaw):null; const end=endRaw?new Date(endRaw):null;
    if(start && Number.isNaN(start.getTime())) throw new Error("Funding Window Start is invalid.");
    if(end && Number.isNaN(end.getTime())) throw new Error("Funding Window End is invalid.");
    if(start&&end&&end<=start) throw new Error("Funding Window End must be later than Start.");

    const items=collectItems();
    return {
      project_code:project.project_code,
      business_stage:businessStage,
      funding_purpose:fundingPurpose,
      funding_mode:fundingMode,
      existing_asset_base:existingAssetBase,
      existing_verified_liquidity:optionalNumberInput("declaredExistingLiquidity","Declared Existing Liquidity"),
      incremental_capital_requirement:optionalNumberInput("declaredCapitalRequirement","Declared Incremental Capital"),
      funding_window_start:start?start.toISOString():null,
      funding_window_end:end?end.toISOString():null,
      operating_cycle_days:optionalIntegerInput("operatingCycleDays","Operating Cycle"),
      expected_capital_cycle_days:optionalIntegerInput("expectedCapitalCycleDays","Expected Capital Cycle"),
      required_reserve:optionalNumberInput("requiredReserve","Required Reserve"),
      contingency_reserve:optionalNumberInput("contingencyReserve","Contingency Reserve"),
      notes:String($("fundingNotes")?.value||"").trim()||null,
      items
    };
  }

  function renderAssessment(funding){
    fundingWorkspace=funding||null;
    const plan=fundingPayloadSource()||{};
    const assessment=assessmentSource()||{};
    const items=fundingItemsSource();

    setInput("businessStage",plan.business_stage||"");
    setInput("fundingPurpose",plan.funding_purpose||"");
    setInput("fundingMode",plan.funding_mode||"");
    setInput("existingAssetBase",plan.existing_asset_base??"");
    setInput("declaredExistingLiquidity",plan.declared_existing_liquidity??"");
    setInput("declaredCapitalRequirement",plan.declared_capital_requirement??"");
    setInput("fundingWindowStart",toDatetimeLocal(plan.funding_window_start));
    setInput("fundingWindowEnd",toDatetimeLocal(plan.funding_window_end));
    setInput("operatingCycleDays",plan.operating_cycle_days??"");
    setInput("expectedCapitalCycleDays",plan.expected_capital_cycle_days??"");
    setInput("requiredReserve",plan.required_reserve??"");
    setInput("contingencyReserve",plan.contingency_reserve??"");
    setInput("fundingNotes",plan.notes??"");
    renderFundingItems(items);

    text("fundingPlanStatus",String(plan.status||"not_submitted").replaceAll("_"," ").toUpperCase());
    text("capitalRequirement",formatPi(plan.incremental_capital_requirement??plan.requested_capital??assessment.validated_capital_requirement));
    text("systemLiquidityRecommendation",assessment.system_recommended_liquidity==null?"Pending":formatPi(assessment.system_recommended_liquidity));
    text("assessmentStatus",String(assessment.liquidity_assessment_status||"not_assessed").replaceAll("_"," ").toUpperCase());
    text("assessmentReadiness",String(assessment.readiness_status||"not_ready").replaceAll("_"," ").toUpperCase());

    const reasons=Array.isArray(assessment.blocking_reasons)?assessment.blocking_reasons:[];
    const reasonsEl=$("assessmentReasons");
    if(reasonsEl){ reasonsEl.replaceChildren(); reasons.forEach(reason=>{ const line=document.createElement("div"); line.textContent=String(reason).replaceAll("_"," "); reasonsEl.appendChild(line); }); reasonsEl.classList.toggle("hidden",reasons.length===0); }

    const noticeTitle=$("fundingPlanNoticeTitle"); const noticeText=$("fundingPlanNoticeText"); const notice=$("fundingPlanNotice");
    if(notice){
      let title="Funding Plan Status"; let msg="No funding plan has been saved yet.";
      const status=String(plan.status||"").toLowerCase();
      if(status==="draft"){ title="Draft saved"; msg="The funding plan is editable. Submit it when the project facts and cost lines are complete."; }
      else if(status==="submitted"){ title="Submitted for assessment"; msg="The plan has been submitted. System assessment and administrator liquidity approval remain separate controls."; }
      else if(status==="approved"){ title="Funding plan approved"; msg="This plan has passed the applicable approval stage. Continue checking the server-defined treasury requirement."; }
      else if(assessment.readiness_status==="blocked"){ title="Assessment blocked"; msg=reasons.length?`Blocking reasons: ${reasons.join(", ")}`:"Additional server prerequisites are required."; }
      if(noticeTitle) noticeTitle.textContent=title; if(noticeText) noticeText.textContent=msg;
      notice.classList.remove("hidden");
    }
  }

  async function loadFundingPlan(){
    if(!project?.project_code) throw new Error("Internal Project code is unavailable.");
    const data=await api().get(`${FUNDING_PLAN_API}?project_code=${encodeURIComponent(project.project_code)}`);
    if(!data || typeof data!=="object") throw new Error("Internal funding plan returned an invalid response.");
    fundingWorkspace=data?.funding_plan||data;
    renderAssessment(fundingWorkspace);
    return fundingWorkspace;
  }

  function setFundingBusy(busy){
    const save=$("saveFundingPlanButton"); const submit=$("submitFundingPlanButton"); const add=$("addFundingItem");
    if(save){ save.disabled=busy; save.innerHTML=busy?'<i class="fa-solid fa-spinner fa-spin"></i><span>Saving…</span>':'<i class="fa-solid fa-floppy-disk"></i><span>Save Draft</span>'; }
    if(submit){ submit.disabled=busy; submit.innerHTML=busy?'<i class="fa-solid fa-spinner fa-spin"></i><span>Submitting…</span>':'<i class="fa-solid fa-paper-plane"></i><span>Submit for Assessment</span>'; }
    if(add) add.disabled=busy;
  }

  async function saveFundingPlan(){
    const payload=collectFundingPayload();
    setFundingBusy(true); show("fundingState",true); text("fundingState","Saving funding plan draft…"); $("fundingState")?.classList.add("active");
    try {
      const data=await api().post(FUNDING_PLAN_API,payload);
      fundingWorkspace=data?.funding_plan||data;
      renderAssessment(fundingWorkspace);
      text("fundingState","Funding plan draft saved. The authoritative incremental capital requirement has been recalculated from the submitted cost lines.");
      $("fundingState")?.classList.add("success");
      return data;
    } catch(error){ text("fundingState",errorMessage(error,"Funding plan could not be saved.")); $("fundingState")?.classList.add("error"); throw error; }
    finally{ setFundingBusy(false); }
  }

  async function submitFundingPlan(){
    const existingPlan=await saveFundingPlan();
    setFundingBusy(true); show("fundingState",true); text("fundingState","Submitting funding plan for server assessment…"); $("fundingState")?.classList.add("active");
    try {
      const data=await api().post(FUNDING_SUBMIT_API,{project_code:project.project_code});
      fundingWorkspace=data?.funding_plan||data;
      renderAssessment(fundingWorkspace);
      text("fundingState","Funding plan submitted. Liquidity recommendation remains controlled by the server assessment and administrator approval workflow.");
      $("fundingState")?.classList.add("success");
      return data;
    } catch(error){ text("fundingState",errorMessage(error,"Funding plan could not be submitted.")); $("fundingState")?.classList.add("error"); throw error; }
    finally{ setFundingBusy(false); }
  }

  function renderTreasury(workspace){
    liquidityWorkspace=workspace||null;
    const treasury=workspace?.treasury||null;
    const assessment=workspace?.funding_assessment||workspace?.assessment||null;
    const configured=workspace?.treasury_configured===true;
    const required=numberValue(treasury?.required_liquidity??workspace?.required_liquidity??assessment?.approved_required_liquidity);
    const verified=numberValue(treasury?.verified_liquidity??workspace?.verified_liquidity);
    const gap=Math.max(numberValue(treasury?.liquidity_gap??workspace?.liquidity_gap),0);
    const ready=workspace?.liquidity_ready===true;

    text("requiredLiquidity",formatPi(required)); text("verifiedLiquidity",formatPi(verified)); text("liquidityGap",formatPi(gap)); text("liquidityReady",ready?"READY":"NOT READY");
    text("treasuryWallet",mask(treasury?.treasury_wallet||""));
    text("treasuryStatus",configured?String(treasury?.status||"configured").toUpperCase():"NOT CONFIGURED");
    text("approvedLiquidityAmount",formatPi(gap));

    const treasuryStatus=String(treasury?.status||"").toLowerCase();
    const payable=configured && ["active","locked"].includes(treasuryStatus) && gap>0 && paymentInProgress!==true;
    const payButton=$("addLiquidityButton");
    if(payButton){ payButton.disabled=!payable; payButton.innerHTML=payable?'<i class="fa-solid fa-arrow-up"></i><span>Pay Server-Computed Remaining Gap</span>':'<i class="fa-solid fa-lock"></i><span>Liquidity Settlement Unavailable</span>'; }

    const hint=$("approvedLiquidityHint");
    if(hint){
      if(!configured) hint.textContent="Treasury must be configured by ALBUKHR administration.";
      else if(gap<=0) hint.textContent="No remaining verified liquidity gap is payable from this workspace.";
      else hint.textContent=`The next Pi payment will be exactly ${formatPi(gap)} according to the current server workspace.`;
    }

    show("treasuryWarning",!configured);
    if(ready){
      setPageStatus("Internal liquidity threshold is satisfied. Investment remains subject to the remaining server-side activation gates.");
      text("investmentGateTitle","Liquidity requirement satisfied");
      text("investmentGateText","Verified liquidity is at or above the server-defined threshold. Project activation, published Internal contract terms, and the Internal investment runtime must still be ready before investment is enabled.");
    } else if(configured){
      setPageStatus(`Internal liquidity is not ready. Current verified liquidity: ${formatPi(verified)}.`);
      text("investmentGateTitle","Liquidity threshold not yet satisfied");
      text("investmentGateText",gap>0?`The server currently reports ${formatPi(gap)} remaining. The Contributor cannot override or replace that amount.`:"The treasury requirement is not currently payable from this workspace. Re-check the funding assessment and treasury state.");
    } else {
      setPageStatus("Treasury is not configured yet. Liquidity settlement is unavailable.");
      text("investmentGateTitle","Treasury configuration required");
      text("investmentGateText","ALBUKHR administration must configure the Mainnet Internal treasury after the funding plan and liquidity assessment stages are satisfied.");
    }
  }

  async function loadLiquidityWorkspace(){
    const data=await api().get(`${LIQUIDITY_WORKSPACE_API}?project_code=${encodeURIComponent(project.project_code)}`);
    if(!data || typeof data!=="object") throw new Error("Internal liquidity workspace could not be loaded.");
    renderTreasury(data); return data;
  }

  function createHistoryRow(row,index){
    const item=document.createElement("article"); item.className="history-item";
    const icon=document.createElement("div"); icon.className="history-icon"; icon.innerHTML='<i class="fa-solid fa-arrow-down"></i>';
    const body=document.createElement("div"); body.className="history-body";
    const title=document.createElement("strong"); title.textContent=`Liquidity Credit #${index+1}`;
    const meta=document.createElement("span"); meta.textContent=`${String(row?.verification_status||"verified").toUpperCase()} · ${formatDate(row?.verified_at||row?.created_at)}`;
    const reference=document.createElement("span"); reference.textContent=row?.verification_reference?`Tx: ${mask(row.verification_reference,6,6)}`:"Verification reference pending";
    body.append(title,meta,reference); const amount=document.createElement("strong"); amount.className="history-amount"; amount.textContent=`+${numberValue(row?.amount).toFixed(3)} Pi`; item.append(icon,body,amount); return item;
  }

  async function loadHistory(){
    const list=$("historyList"); if(!list) return; list.replaceChildren(); show("historyEmpty",false); show("historyError",false);
    const data=await api().get(`${LIQUIDITY_HISTORY_API}?project_code=${encodeURIComponent(project.project_code)}`);
    const payments=Array.isArray(data?.payments)?data.payments:[]; payments.forEach((row,index)=>list.appendChild(createHistoryRow(row,index))); show("historyEmpty",payments.length===0);
  }

  async function refreshDashboard(){
    clearError();
    try{
      await loadContributorWorkspace();
      await loadFundingPlan();
      await loadLiquidityWorkspace();
      try{ await loadHistory(); }catch(historyError){ text("historyError",errorMessage(historyError,"Liquidity history is currently unavailable.")); show("historyError",true); }
    }catch(error){ console.error("[ALBUKHR INTERNAL DASHBOARD]",error); showError(errorMessage(error,"Internal Project Dashboard could not be loaded.")); }
  }

  async function loadContributorWorkspace(){
    const data=await api().get(WORKSPACE_API);
    if(!data?.success) throw new Error(data?.message||data?.error||"Contributor workspace could not be loaded.");
    contributorWorkspace=data;
    if(!data?.contributor||String(data.contributor.status||"").toLowerCase()!=="active") throw new Error("Active Contributor authorization is required.");
    if(data.profile_complete===false) throw new Error("Contributor registration profile must be completed before using the Internal Dashboard.");
    if(!data?.project) throw new Error("No Contributor Internal Project is currently assigned to this Contributor.");
    renderProject(data.project); return data;
  }

  async function startLiquidityPayment(){
    if(paymentInProgress) throw new Error("A liquidity payment is already being processed.");
    assertMainnet();
    if(!project?.project_code) throw new Error("Internal Project identity is unavailable.");
    await loadLiquidityWorkspace();
    const treasury=liquidityWorkspace?.treasury; const status=String(treasury?.status||"").toLowerCase();
    if(liquidityWorkspace?.treasury_configured!==true||!["active","locked"].includes(status)) throw new Error("Internal Project treasury is not configured or active.");
    const amount=numberValue(treasury?.liquidity_gap??liquidityWorkspace?.liquidity_gap);
    if(!(amount>0)) throw new Error("The server reports no remaining liquidity gap to settle.");
    if(!window.Pi||typeof window.Pi.createPayment!=="function") throw new Error("Pi payment API is unavailable. Open ALBUKHR in Pi Browser.");

    paymentInProgress=true; renderTreasury(liquidityWorkspace);
    const button=$("addLiquidityButton"); if(button){button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i><span>Processing…</span>';}
    const paymentState=$("paymentState"); if(paymentState){paymentState.textContent=`Preparing server-computed liquidity payment of ${formatPi(amount)}…`;paymentState.className="payment-state active";}

    return new Promise((resolve,reject)=>{
      let settled=false;
      const rejectOnce=(e)=>{if(!settled){settled=true;reject(e);}};
      const resolveOnce=(v)=>{if(!settled){settled=true;resolve(v);}};
      const metadata={network:MAINNET,action:"add_liquidity",project_code:project.project_code,contract_version:"internal_liquidity_v1",engine:ENGINE};
      try{
        window.Pi.createPayment({amount,memo:`ALBUKHR ${project.project_code} internal liquidity`,metadata},{
          onReadyForServerApproval:async(paymentId)=>{try{if(paymentState)paymentState.textContent="Pi payment created. ALBUKHR server approval is in progress…";await api().post(LIQUIDITY_APPROVE_API,{payment_id:paymentId,project_code:project.project_code,amount});if(paymentState)paymentState.textContent="Payment approved. Complete the Pi transaction to settle the server-defined liquidity.";}catch(error){rejectOnce(error);}},
          onReadyForServerCompletion:async(paymentId,txid)=>{try{if(paymentState)paymentState.textContent="Pi transaction received. ALBUKHR is verifying and settling the liquidity…";const result=await api().post(LIQUIDITY_COMPLETE_API,{payment_id:paymentId,project_code:project.project_code,amount,txid});if(paymentState){paymentState.textContent="Liquidity settled successfully.";paymentState.className="payment-state success";}resolveOnce(result);}catch(error){rejectOnce(error);}},
          onCancel:()=>rejectOnce(new Error("Pi liquidity payment was cancelled.")),
          onError:(error)=>rejectOnce(new Error(error?.message||"Pi liquidity payment failed."))
        });
      }catch(error){rejectOnce(error);}
    });
  }

  async function settleLiquidity(){
    try{ await startLiquidityPayment(); await refreshDashboard(); const state=$("paymentState"); if(state){state.textContent="Internal liquidity settlement completed successfully.";state.className="payment-state success";} }
    catch(error){ const message=errorMessage(error,"Internal liquidity payment could not be completed."); const state=$("paymentState"); if(state){state.textContent=message;state.className="payment-state error";} showError(message); }
    finally{ paymentInProgress=false; if(liquidityWorkspace)renderTreasury(liquidityWorkspace); }
  }

  function bindEvents(){
    $("addFundingItem")?.addEventListener("click",()=>{ const list=$("fundingItems"); if(!list) return; const rows=list.querySelectorAll(".funding-item-row"); list.appendChild(renderFundingItem({},rows.length)); });
    $("saveFundingPlanButton")?.addEventListener("click",async()=>{try{await saveFundingPlan();}catch(error){showError(errorMessage(error,"Funding plan could not be saved."));}});
    $("submitFundingPlanButton")?.addEventListener("click",async()=>{try{await submitFundingPlan();await refreshDashboard();}catch(error){showError(errorMessage(error,"Funding plan could not be submitted."));}});
    $("addLiquidityButton")?.addEventListener("click",settleLiquidity);
    $("refreshButton")?.addEventListener("click",refreshDashboard);
    $("refreshBottomButton")?.addEventListener("click",refreshDashboard);
    $("errorRefresh")?.addEventListener("click",refreshDashboard);
    $("backButton")?.addEventListener("click",()=>{if(window.history.length>1)window.history.back();else window.location.href="contributor.html";});
    $("closeButton")?.addEventListener("click",()=>{window.location.href="index.html";});
  }

  async function init(){
    bindEvents();
    try{
      if(!window.ALBukhrEnvironment?.isMainnet?.()) throw new Error("Contributor Internal Dashboard is Mainnet-only.");
      if(!window.AlbukhrPageAuthGuard) throw new Error("ALBUKHR Page Auth Guard is unavailable.");
      currentUser=await window.AlbukhrPageAuthGuard.waitForAuth(); if(!currentUser)return; assertMainnet(); await refreshDashboard();
    }catch(error){console.error("[ALBUKHR INTERNAL DASHBOARD INIT]",error);showError(errorMessage(error,"Contributor Internal Dashboard initialization failed."));}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
