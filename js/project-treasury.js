/* ALBUKHR PROJECT TREASURY v5 — READ-ONLY APP boundary
   Financial mutations belong to authorized API/Admin flows. */
(function(window){
"use strict";
const T="project_treasury",TX="project_treasury_transactions";
function sb(){return window.ALBUKHR_SUPABASE?.client||window.albukhrSupabase||null}
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function row(r={}){return {...r,liquidity_balance:n(r.liquidity_balance),total_added:n(r.total_added),total_withdrawn:n(r.total_withdrawn),total_reward_funded:n(r.total_reward_funded)}}
async function fetchProjectTreasuryRow(code){
 if(!code)return {error:"Project code is required"};const c=sb();if(!c)return {error:"Supabase Core is unavailable."};
 const {data,error}=await c.from(T).select("*").eq("project_code",code).maybeSingle();if(error)return {error:error.message};return {success:true,data:data?row(data):null}
}
async function getProjectTreasury(code){const r=await fetchProjectTreasuryRow(code);return r.error?r:r.data}
async function getProjectLiquidity(code){const r=await fetchProjectTreasuryRow(code);return r.data?n(r.data.liquidity_balance):0}
async function getProjectTreasuryHistory(code,limit=50){const c=sb();if(!c||!code)return [];const {data,error}=await c.from(TX).select("*").eq("project_code",code).order("created_at",{ascending:false}).limit(Math.max(1,n(limit,50)));if(error)return [];return data||[]}
async function getProjectTreasurySnapshot(code,limit=20){const project=await window.getProjectMeta?.(code);if(!project)return {error:"Project not found"};const t=await fetchProjectTreasuryRow(code);if(t.error)return t;return {success:true,project,treasury:t.data,history:await getProjectTreasuryHistory(code,limit)}}
async function getAllProjectTreasuries(){const c=sb();if(!c)return [];const {data,error}=await c.from(T).select("*").order("project_name");return error?[]:(data||[]).map(row)}
async function getProjectTreasuriesByType(type){return (await getAllProjectTreasuries()).filter(x=>String(x.project_type||"").toLowerCase()===String(type||"").toLowerCase())}
const blocked=async()=>({error:"Treasury mutation is not available in the App. Use the authorized Mainnet API/Admin flow."});
window.fetchProjectTreasuryRow=fetchProjectTreasuryRow;window.getProjectTreasury=getProjectTreasury;window.getProjectLiquidity=getProjectLiquidity;window.getProjectTreasuryHistory=getProjectTreasuryHistory;window.getProjectTreasurySnapshot=getProjectTreasurySnapshot;window.getAllProjectTreasuries=getAllProjectTreasuries;window.getProjectTreasuriesByType=getProjectTreasuriesByType;
window.getCoreProjectTreasuries=()=>getProjectTreasuriesByType("core");window.getInternalProjectTreasuries=()=>getProjectTreasuriesByType("internal");window.getExternalProjectTreasuries=()=>getProjectTreasuriesByType("external");
window.createProjectTreasury=blocked;window.ensureProjectTreasury=async code=>{const r=await fetchProjectTreasuryRow(code);return r.data?r:{error:r.error||"Treasury does not exist."}};
window.addProjectLiquidity=blocked;window.projectInternalWithdraw=blocked;window.fundRewardFromTreasury=blocked;window.insertTreasuryTransaction=blocked;window.updateTreasuryRow=blocked;
window.getAllTreasurySnapshots=async()=> (await getAllProjectTreasuries()).map(row);
window.getTreasuryEngineSummary=async code=>{const r=await fetchProjectTreasuryRow(code);return r.data||{project_code:code,error:r.error||"Treasury not found"}};
})(window);
