/* ALBUKHR PROJECT TREASURY v6 — API-authoritative read boundary */
(function(window){
  "use strict";
  if(window.AlbukhrProjectTreasury) return;

  const MAINNET="mainnet";

  function clean(v){return String(v==null?"":v).trim();}
  function network(){return clean(window.ALBukhrEnvironment?.getNetwork?.()).toLowerCase();}
  function mainnet(){return network()===MAINNET;}

  function api(){
    if(!window.AlbukhrApi || typeof window.AlbukhrApi.get!=="function"){
      throw new Error("ALBUKHR API Core is unavailable.");
    }
    return window.AlbukhrApi;
  }

  function code(value){
    const v=clean(value);
    if(!v) throw new Error("Project code is required.");
    return v;
  }

  function numeric(v){
    const n=Number(v);
    return Number.isFinite(n)?n:0;
  }

  async function getProjectTreasury(projectCode){
    if(!mainnet()) return {success:false,network:network(),configured:false,treasury:null,error:"Treasury is available only on Mainnet."};
    const result=await api().get(`/api/project-treasury?project_code=${encodeURIComponent(code(projectCode))}`);
    if(!result || result.success!==true) throw new Error(result?.error||"Unable to load project treasury.");
    const t=result.data?.treasury||null;
    return {
      success:true,
      network:MAINNET,
      configured:Boolean(result.data?.configured),
      project_id:result.data?.project_id||null,
      project_code:result.data?.project_code||code(projectCode),
      project_status:result.data?.project_status||null,
      core_slot:result.data?.core_slot??null,
      treasury:t?{
        id:t.id||null,
        project_id:t.project_id||null,
        network:t.network||MAINNET,
        treasury_wallet:clean(t.treasury_wallet),
        required_liquidity:numeric(t.required_liquidity),
        verified_liquidity:numeric(t.verified_liquidity),
        status:clean(t.status).toLowerCase(),
        created_at:t.created_at||null,
        updated_at:t.updated_at||null
      }:null
    };
  }

  async function getProjectLiquidity(projectCode){
    const result=await getProjectTreasury(projectCode);
    return numeric(result.treasury?.verified_liquidity);
  }

  async function getProjectTreasuryHistory(projectCode,limit=50){
    if(!mainnet()) return [];
    const safeLimit=Math.min(Math.max(Number(limit)||50,1),100);
    const result=await api().get(
      `/api/project-treasury-history?project_code=${encodeURIComponent(code(projectCode))}&limit=${safeLimit}`
    );
    if(!result || result.success!==true) throw new Error(result?.error||"Unable to load project treasury history.");
    return Array.isArray(result.data)?result.data:[];
  }

  async function getProjectTreasurySnapshot(projectCode,limit=20){
    const treasury=await getProjectTreasury(projectCode);
    const history=await getProjectTreasuryHistory(projectCode,limit);
    return {success:true,project_code:treasury.project_code,treasury,history};
  }

  async function getAllProjectTreasuries(){
    /* No cross-project treasury listing is exposed to the App. */
    return [];
  }

  async function getProjectTreasuriesByType(){
    return [];
  }

  const blocked=async()=>({error:"Treasury mutation is not available in the App. Use the authorized Mainnet API/Admin flow."});

  window.fetchProjectTreasuryRow=getProjectTreasury;
  window.getProjectTreasury=getProjectTreasury;
  window.getProjectLiquidity=getProjectLiquidity;
  window.getProjectTreasuryHistory=getProjectTreasuryHistory;
  window.getProjectTreasurySnapshot=getProjectTreasurySnapshot;
  window.getAllProjectTreasuries=getAllProjectTreasuries;
  window.getProjectTreasuriesByType=getProjectTreasuriesByType;
  window.getCoreProjectTreasuries=()=>[];
  window.getInternalProjectTreasuries=()=>[];
  window.getExternalProjectTreasuries=()=>[];
  window.createProjectTreasury=blocked;
  window.ensureProjectTreasury=async function(projectCode){
    const result=await getProjectTreasury(projectCode);
    return result.configured?result:{error:"Treasury is not configured."};
  };
  window.addProjectLiquidity=blocked;
  window.projectInternalWithdraw=blocked;
  window.fundRewardFromTreasury=blocked;
  window.insertTreasuryTransaction=blocked;
  window.updateTreasuryRow=blocked;
  window.getAllTreasurySnapshots=async()=>[];
  window.getTreasuryEngineSummary=async function(projectCode){
    const result=await getProjectTreasury(projectCode);
    return result.treasury||{project_code:result.project_code,configured:false};
  };

  window.AlbukhrProjectTreasury=Object.freeze({
    getProjectTreasury,
    getProjectLiquidity,
    getProjectTreasuryHistory,
    getProjectTreasurySnapshot
  });
})(window);
