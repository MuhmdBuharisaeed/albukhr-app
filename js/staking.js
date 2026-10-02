/* ALBUKHR STAKING ENGINE v4 — API-authoritative Mainnet investment / V2 contract runtime */
(function(window){
  "use strict";
  if(window.AlbukhrStaking) return;

  const DURATIONS=[30,60,90,180,365,430];
  const TERMS_RPC="get_public_core_staking_terms_v2";
  let busy=false;
  const termsCache=new Map();
  const termsPromises=new Map();

  function clean(v){return String(v==null?"":v).trim();}
  function normalizeCode(v){return clean(v).toUpperCase();}
  function mainnet(){return clean(window.ALBukhrEnvironment?.getNetwork?.()).toLowerCase()==="mainnet";}
  function cfg(project){
    if(typeof window.getProjectConfig!=="function") return null;
    return window.getProjectConfig(project);
  }
  function core(){
    const c=window.ALBUKHR_SUPABASE;
    if(!c||!c.client||typeof c.rpc!=="function") throw new Error("ALBUKHR Supabase Core is not loaded.");
    if(clean(c.network).toLowerCase()!=="mainnet") throw new Error("Mainnet staking contract is unavailable on Testnet.");
    return c;
  }
  function api(){
    if(!window.AlbukhrApi||typeof window.AlbukhrApi.post!=="function") throw new Error("ALBUKHR API Core is not loaded.");
    return window.AlbukhrApi;
  }
  async function auth(){
    if(!window.AlbukhrPiAuth?.ensurePiAuth) throw new Error("ALBUKHR Pi Auth Core is not loaded.");
    const u=await window.AlbukhrPiAuth.ensurePiAuth();
    if(!u?.pi_uid) throw new Error("Pi authentication is required.");
    if(clean(u.network).toLowerCase()!=="mainnet") throw new Error("Mainnet investment is unavailable from Testnet.");
    return u;
  }
  function projectCode(project){
    const c=cfg(project);
    return normalizeCode(c?.project_code);
  }
  function projectId(project){
    const c=cfg(project);
    return clean(c?.project_id);
  }
  function status(project){return clean(cfg(project)?.status).toLowerCase();}

  function normalizeTerm(term){
    if(!term||typeof term!=="object") return null;
    const duration=Number(term.duration_days);
    if(!Number.isInteger(duration)||!DURATIONS.includes(duration)) return null;
    const min=Number(term.min_stake);
    const max=term.max_stake==null?null:Number(term.max_stake);
    const rate=Number(term.reward_rate);
    if(!Number.isFinite(min)||min<=0) return null;
    if(max!==null&&(!Number.isFinite(max)||max<min)) return null;
    if(term.reward_model==="fixed_rate"&&!Number.isFinite(rate)) return null;
    return Object.freeze({
      term_version_id:clean(term.term_version_id)||null,
      term_key:clean(term.term_key)||null,
      version_number:Number(term.version_number)||0,
      duration_days:duration,
      min_stake:min,
      max_stake:max,
      reward_model:clean(term.reward_model)||null,
      reward_rate:Number.isFinite(rate)?rate:null,
      reward_definition:term.reward_definition??null,
      early_withdrawal_policy:term.early_withdrawal_policy??null,
      capital_withdrawal_policy:term.capital_withdrawal_policy??null,
      reward_withdrawal_policy:term.reward_withdrawal_policy??null,
      funding_start_at:term.funding_start_at||null,
      funding_end_at:term.funding_end_at||null,
      disclosure_version:clean(term.disclosure_version)||null,
      consent_version:clean(term.consent_version)||null,
      effective_from:term.effective_from||null,
      effective_until:term.effective_until||null
    });
  }

  async function getStakingTerms(project,{force=false}={}){
    if(!mainnet()) throw new Error("Investment is available only on ALBUKHR Mainnet.");
    const id=projectId(project), code=projectCode(project);
    if(!id) throw new Error("Authoritative project ID is unavailable.");
    if(!code) throw new Error("Authoritative project code is unavailable.");
    const key=`mainnet:${id}`;
    if(!force&&termsCache.has(key)) return termsCache.get(key);
    if(!force&&termsPromises.has(key)) return termsPromises.get(key);

    const promise=(async()=>{
      const c=core();
      const result=await c.rpc(TERMS_RPC,{p_project_id:id,p_network:"mainnet"});
      if(result?.error) throw result.error;
      const data=result?.data;
      if(!data||data.success!==true) throw new Error("Published staking contract is unavailable for this project.");
      if(clean(data.network).toLowerCase()!=="mainnet") throw new Error("Invalid staking contract network.");
      if(clean(data.project_id)!==id) throw new Error("Staking contract project identity mismatch.");
      if(normalizeCode(data.project_code)!==code) throw new Error("Staking contract project code mismatch.");
      const terms=Array.isArray(data.terms)?data.terms.map(normalizeTerm).filter(Boolean):[];
      const unique=new Map();
      terms.forEach(t=>{if(!unique.has(t.duration_days))unique.set(t.duration_days,t);});
      const normalized=Object.freeze(Array.from(unique.values()).sort((a,b)=>a.duration_days-b.duration_days));
      termsCache.set(key,normalized);
      return normalized;
    })();
    termsPromises.set(key,promise);
    try{return await promise;}finally{termsPromises.delete(key);}
  }

  function cachedTerms(project){
    const id=projectId(project);
    return id?termsCache.get(`mainnet:${id}`)||[]:[];
  }

  function getTerm(project,duration){
    const d=Number(duration);
    return cachedTerms(project).find(t=>t.duration_days===d)||null;
  }

  async function validate(project,amount,duration){
    if(!mainnet()) throw new Error("Investment is available only on Mainnet.");
    if(status(project)!=="active") throw new Error("This project is not ACTIVE for investment.");
    const code=projectCode(project);
    if(!code) throw new Error("Authoritative project code is unavailable.");
    const a=Number(amount),d=Number(duration);
    if(!Number.isFinite(a)||a<=0) throw new Error("Stake amount must be greater than zero.");
    const terms=await getStakingTerms(project);
    const term=terms.find(t=>t.duration_days===d);
    if(!term) throw new Error("Selected staking duration is not published for this project.");
    if(a<term.min_stake) throw new Error(`Minimum stake for ${d} days is ${term.min_stake} Pi.`);
    if(term.max_stake!==null&&a>term.max_stake) throw new Error(`Maximum stake for ${d} days is ${term.max_stake} Pi.`);
    return {code,projectId:projectId(project),amount:a,duration:d,term};
  }

  async function startPiPayment({amount,memo,projectCode:code,duration,termVersionId}={} ){
    await auth();
    if(!window.Pi?.createPayment) throw new Error("Pi payment API is unavailable. Open ALBUKHR in Pi Browser.");
    return new Promise((resolve,reject)=>{
      let finished=false;
      const done=(fn,v)=>{if(finished)return;finished=true;fn(v);};
      const metadata={network:"mainnet",action:"add_liquidity",project_code:code,duration:Number(duration),term_version_id:termVersionId||null,contract_version:"v2"};
      try{
        window.Pi.createPayment({
          amount:Number(amount),
          memo:memo||`ALBUKHR ${code} investment`,
          metadata
        },{
          onReadyForServerApproval:async paymentId=>{
            try{
              await api().post("/api/pi-payment-approve",{
                payment_id:paymentId,project_code:code,amount:Number(amount),duration:Number(duration),term_version_id:termVersionId||null
              });
            }catch(error){done(reject,error);}
          },
          onReadyForServerCompletion:async(paymentId,txid)=>{
            try{
              const result=await api().post("/api/pi-payment-complete",{
                payment_id:paymentId,txid,project_code:code,amount:Number(amount),duration:Number(duration),term_version_id:termVersionId||null
              });
              done(resolve,result);
            }catch(error){done(reject,error);}
          },
          onCancel:()=>done(reject,new Error("Pi payment cancelled.")),
          onError:error=>done(reject,new Error(error?.message||"Pi payment failed."))
        });
      }catch(error){done(reject,error);}
    });
  }

  async function addStake({project,amount,duration}={}){
    if(busy) return {error:"Another investment is already being processed."};
    busy=true;
    try{
      const input=await validate(project,amount,duration);
      await auth();
      const result=await startPiPayment({
        amount:input.amount,
        duration:input.duration,
        projectCode:input.code,
        termVersionId:input.term.term_version_id,
        memo:`ALBUKHR ${input.code} investment`
      });
      const stake=result?.stake?.stake||result?.stake||result?.data?.stake;
      return {success:true,stake:stake||result};
    }catch(error){
      console.error("ALBUKHR STAKING:",error);
      return {error:error?.message||"Investment failed."};
    }finally{busy=false;}
  }

  async function getAllStakesMerged(){
    try{
      await auth();
      const rows=await api().get("/api/my-stakes?network=mainnet");
      return Array.isArray(rows)?rows:[];
    }catch(error){console.warn("ALBUKHR stakes unavailable:",error);return []}
  }

  async function getProjectStakes(project){
    const code=projectCode(project);
    if(!code)return [];
    try{await auth();const rows=await api().get(`/api/my-stakes?network=mainnet&project_code=${encodeURIComponent(code)}`);return Array.isArray(rows)?rows:[];}
    catch(error){console.warn("ALBUKHR project stakes unavailable:",error);return [];}
  }

  async function getProjectTotals(project){
    const rows=await getProjectStakes(project);
    return rows.reduce((out,row)=>{out.stake+=Number(row.amount)||0;out.reward+=Number(row.reward_amount)||0;return out;},{stake:0,reward:0});
  }

  function getMinStake(project,duration){
    const terms=cachedTerms(project);
    const exact=duration==null?null:getTerm(project,duration);
    if(exact) return exact.min_stake;
    return terms.length?Math.min(...terms.map(t=>t.min_stake)):0;
  }

  function getRewardRate(project,duration){
    const term=getTerm(project,duration);
    return term&&term.reward_rate!=null?Number(term.reward_rate):0;
  }

  window.AlbukhrStaking=Object.freeze({
    addStake,startPiPayment,getStakingTerms,getTerm,getAllStakesMerged,getProjectStakes,getProjectTotals,getMinStake,getRewardRate
  });
  window.addStake=addStake;
  window.startPiPayment=startPiPayment;
  window.getStakingTerms=getStakingTerms;
  window.getStakingTerm=getTerm;
  window.getAllStakesMerged=getAllStakesMerged;
  window.getProjectStakes=getProjectStakes;
  window.getProjectTotals=getProjectTotals;
  window.getMinStake=getMinStake;
  window.getRewardRate=getRewardRate;
})(window);
