/* ALBUKHR — Contributor Internal Investment Engine v1
 * Separate runtime from the existing Core staking engine.
 */
(function(window){
  "use strict";
  if(window.AlbukhrInternalStaking) return;

  const DURATIONS=[30,60,90,180,365,430];
  const TERMS_RPC="get_public_internal_staking_terms_v2";
  const SECURITY_TERMS_RPC="get_internal_contract_terms_v2";
  const API_APPROVE="/api/internal-payment-approve";
  const API_COMPLETE="/api/internal-payment-complete";
  const cache=new Map();
  const pending=new Map();

  const coreEngine=window.AlbukhrStaking||null;
  const original={
    addStake:window.addStake,
    getStakingTerms:window.getStakingTerms,
    getStakingTerm:window.getStakingTerm,
    getMinStake:window.getMinStake,
    getRewardRate:window.getRewardRate
  };

  function clean(value){return String(value==null?"":value).trim();}
  function code(value){return clean(value).toUpperCase();}
  function network(){return clean(window.AlbukhrEnvironment?.getNetwork?.()).toLowerCase();}
  function isMainnet(){return network()==="mainnet";}
  function cfg(project){return typeof window.getProjectConfig==="function"?window.getProjectConfig(project):null;}
  function projectType(project){return clean(cfg(project)?.project_type).toLowerCase();}
  function projectId(project){return clean(cfg(project)?.project_id);}
  function projectCode(project){return code(cfg(project)?.project_code);}
  function status(project){return clean(cfg(project)?.status).toLowerCase();}
  function isInternal(project){return projectType(project)==="internal";}

  function client(){
    const c=window.ALBukhr_SUPABASE;
    if(!c||!c.client||typeof c.rpc!=="function") throw new Error("ALBUKHR Supabase Core is not loaded.");
    if(clean(c.network).toLowerCase()!=="mainnet") throw new Error("Mainnet Internal investment is unavailable on Testnet.");
    return c;
  }

  function securityRpc(functionName,params={}){
    const core=client();
    if(typeof core.client?.schema!=="function") throw new Error("Supabase schema client is unavailable.");
    return core.client.schema("albukhr_security").rpc(functionName,params);
  }

  function api(){
    if(!window.AlbukhrApi||typeof window.AlbukhrApi.post!=="function") throw new Error("ALBUKHR API Core is not loaded.");
    return window.AlbukhrApi;
  }

  async function auth(){
    if(!window.AlbukhrPiAuth?.ensurePiAuth) throw new Error("ALBUKHR Pi Auth Core is not loaded.");
    const user=await window.AlbukhrPiAuth.ensurePiAuth();
    if(!user?.pi_uid) throw new Error("Pi authentication is required.");
    if(clean(user.network).toLowerCase()!=="mainnet") throw new Error("Mainnet investment is unavailable from Testnet.");
    return user;
  }

  function normalizeTerm(term){
    if(!term||typeof term!=="object") return null;
    const d=Number(term.duration_days);
    const min=Number(term.min_stake);
    const max=term.max_stake==null?null:Number(term.max_stake);
    const rate=Number(term.reward_rate);
    if(!Number.isInteger(d)||!DURATIONS.includes(d)) return null;
    if(!Number.isFinite(min)||min<=0) return null;
    if(max!==null&&(!Number.isFinite(max)||max<min)) return null;
    if(term.reward_model!=="fixed_rate"||!Number.isFinite(rate)) return null;
    return Object.freeze({
      term_version_id:clean(term.term_version_id)||null,
      term_key:clean(term.term_key)||null,
      version_number:Number(term.version_number)||0,
      duration_days:d,
      min_stake:min,
      max_stake:max,
      reward_model:"fixed_rate",
      reward_rate:rate,
      reward_definition:term.reward_definition??null,
      early_withdrawal_policy:term.early_withdrawal_policy??null,
      capital_withdrawal_policy:term.capital_withdrawal_policy??null,
      reward_withdrawal_policy:term.reward_withdrawal_policy??null,
      disclosure_version:clean(term.disclosure_version)||null,
      consent_version:clean(term.consent_version)||null,
      effective_from:term.effective_from||null,
      effective_until:term.effective_until||null
    });
  }

  async function getInternalStakingTerms(project,{force=false}={}){
    if(!isMainnet()) throw new Error("Internal investment is available only on ALBUKHR Mainnet.");
    if(!isInternal(project)) throw new Error("This is not a Contributor Internal Project.");

    const id=projectId(project);
    const projectCodeValue=projectCode(project);
    if(!id||!projectCodeValue) throw new Error("Authoritative Internal Project identity is unavailable.");

    const key=`mainnet:${id}`;
    if(!force&&cache.has(key)) return cache.get(key);
    if(!force&&pending.has(key)) return pending.get(key);

    const promise=(async()=>{
      const result=await securityRpc(SECURITY_TERMS_RPC,{p_project_id:id,p_network:"mainnet"});
      if(result?.error) throw result.error;
      const data=result?.data;
      if(!data||data.success!==true) throw new Error("Published Internal investment contract is unavailable.");
      if(clean(data.network).toLowerCase()!=="mainnet") throw new Error("Invalid Internal investment contract network.");
      if(clean(data.project_id)!==id) throw new Error("Internal contract project identity mismatch.");
      if(code(data.project_code)!==projectCodeValue) throw new Error("Internal contract project code mismatch.");

      const unique=new Map();
      (Array.isArray(data.terms)?data.terms:[]).map(normalizeTerm).filter(Boolean).forEach(term=>{
        if(!unique.has(term.duration_days)) unique.set(term.duration_days,term);
      });
      const terms=Object.freeze(Array.from(unique.values()).sort((a,b)=>a.duration_days-b.duration_days));
      cache.set(key,terms);
      return terms;
    })();

    pending.set(key,promise);
    try{return await promise;}finally{pending.delete(key);}
  }

  function cached(project){
    const id=projectId(project);
    return id?cache.get(`mainnet:${id}`)||[]:[];
  }

  function getTerm(project,duration){
    const d=Number(duration);
    return cached(project).find(term=>term.duration_days===d)||null;
  }

  async function validate(project,amount,duration){
    if(!isMainnet()) throw new Error("Internal investment is available only on Mainnet.");
    if(!isInternal(project)) throw new Error("This investment path is only for Contributor Internal Projects.");
    if(status(project)!=="active") throw new Error("This Internal Project is not ACTIVE for investment.");

    const a=Number(amount),d=Number(duration);
    if(!Number.isFinite(a)||a<=0) throw new Error("Investment amount must be greater than zero.");

    const terms=await getInternalStakingTerms(project);
    const term=terms.find(item=>item.duration_days===d);
    if(!term) throw new Error("Selected Internal investment duration is not published.");
    if(a<term.min_stake) throw new Error(`Minimum investment for ${d} days is ${term.min_stake} Pi.`);
    if(term.max_stake!==null&&a>term.max_stake) throw new Error(`Maximum investment for ${d} days is ${term.max_stake} Pi.`);

    return {code:projectCode(project),projectId:projectId(project),amount:a,duration:d,term};
  }

  async function startPiPayment({amount,memo,projectCode:projectCodeValue,duration,termVersionId}={}){
    await auth();
    if(!window.Pi?.createPayment) throw new Error("Pi payment API is unavailable. Open ALBUKHR in Pi Browser.");

    return new Promise((resolve,reject)=>{
      let finished=false;
      const done=(fn,value)=>{if(finished)return;finished=true;fn(value);};
      const metadata={
        network:"mainnet",
        action:"investment",
        project_code:projectCodeValue,
        duration:Number(duration),
        term_version_id:termVersionId||null,
        contract_version:"internal_v1",
        engine:"CONTRIBUTOR_INTERNAL_V1"
      };

      try{
        window.Pi.createPayment({
          amount:Number(amount),
          memo:memo||`ALBUKHR ${projectCodeValue} internal investment`,
          metadata
        },{
          onReadyForServerApproval:async paymentId=>{
            try{
              await api().post(API_APPROVE,{
                payment_id:paymentId,
                project_code:projectCodeValue,
                amount:Number(amount),
                duration:Number(duration),
                term_version_id:termVersionId||null
              });
            }catch(error){done(reject,error);}
          },
          onReadyForServerCompletion:async(paymentId,txid)=>{
            try{
              const result=await api().post(API_COMPLETE,{
                payment_id:paymentId,
                txid,
                project_code:projectCodeValue,
                amount:Number(amount),
                duration:Number(duration),
                term_version_id:termVersionId||null
              });
              done(resolve,result);
            }catch(error){done(reject,error);}
          },
          onCancel:()=>done(reject,new Error("Pi Internal investment payment cancelled.")),
          onError:error=>done(reject,new Error(error?.message||"Pi Internal investment payment failed."))
        });
      }catch(error){done(reject,error);}
    });
  }

  async function addInternalStake({project,amount,duration}={}){
    const input=await validate(project,amount,duration);
    const result=await startPiPayment({
      amount:input.amount,
      duration:input.duration,
      projectCode:input.code,
      termVersionId:input.term.term_version_id,
      memo:`ALBUKHR ${input.code} internal investment`
    });
    const stake=result?.stake?.stake||result?.stake||result?.data?.stake;
    return {success:true,stake:stake||result};
  }

  function isInternalProject(project){return isInternal(project);}

  async function getStakingTerms(project,options){
    return isInternalProject(project)
      ? getInternalStakingTerms(project,options)
      : original.getStakingTerms(project,options);
  }

  function getStakingTerm(project,duration){
    return isInternalProject(project)
      ? getTerm(project,duration)
      : original.getStakingTerm(project,duration);
  }

  function getMinStake(project,duration){
    if(!isInternalProject(project)) return original.getMinStake(project,duration);
    const exact=duration==null?null:getTerm(project,duration);
    if(exact) return exact.min_stake;
    const terms=cached(project);
    return terms.length?Math.min(...terms.map(term=>term.min_stake)):0;
  }

  function getRewardRate(project,duration){
    if(!isInternalProject(project)) return original.getRewardRate(project,duration);
    const term=getTerm(project,duration);
    return term?Number(term.reward_rate):0;
  }

  async function dispatchAddStake(input={}){
    const project=input.project;
    return isInternalProject(project)
      ? addInternalStake(input)
      : original.addStake(input);
  }

  window.AlbukhrInternalStaking=Object.freeze({
    addStake:addInternalStake,
    startPiPayment,
    getStakingTerms:getInternalStakingTerms,
    getTerm,
    getMinStake:getMinStake,
    getRewardRate:getRewardRate
  });

  window.getStakingTerms=getStakingTerms;
  window.getStakingTerm=getStakingTerm;
  window.getMinStake=getMinStake;
  window.getRewardRate=getRewardRate;
  window.addStake=dispatchAddStake;

})(window);
