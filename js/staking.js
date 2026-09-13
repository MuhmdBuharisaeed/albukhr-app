/* ALBUKHR STAKING ENGINE v3 — API-authoritative Mainnet investment */
(function(window){
  "use strict";
  if(window.AlbukhrStaking) return;

  const DURATIONS=[30,60,90,180,365,430];
  let busy=false;

  function clean(v){return String(v==null?"":v).trim();}
  function mainnet(){return clean(window.ALBukhrEnvironment?.getNetwork?.()).toLowerCase()==="mainnet";}
  function cfg(project){
    if(typeof window.getProjectConfig!=="function") return null;
    return window.getProjectConfig(project);
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
    return clean(c?.project_code);
  }
  function status(project){return clean(cfg(project)?.status).toLowerCase();}
  function minStake(project){
    const c=cfg(project);
    const v=Number(c?.min_stake);
    return Number.isFinite(v)&&v>0?v:10;
  }
  function validate(project,amount,duration){
    if(!mainnet()) throw new Error("Investment is available only on Mainnet.");
    if(status(project)!=="active") throw new Error("This project is not ACTIVE for investment.");
    const code=projectCode(project);
    if(!code) throw new Error("Authoritative project code is unavailable.");
    const a=Number(amount),d=Number(duration);
    if(!Number.isFinite(a)||a<minStake(project)) throw new Error(`Minimum stake is ${minStake(project)} Pi.`);
    if(!DURATIONS.includes(d)) throw new Error("Invalid staking duration.");
    return {code,amount:a,duration:d};
  }

  async function startPiPayment({amount,memo,projectCode:code,duration}={}){
    await auth();
    if(!window.Pi?.createPayment) throw new Error("Pi payment API is unavailable. Open ALBUKHR in Pi Browser.");
    return new Promise((resolve,reject)=>{
      let finished=false;
      const done=(fn,v)=>{if(finished)return;finished=true;fn(v);};
      const metadata={network:"mainnet",action:"add_liquidity",project_code:code,duration:Number(duration)};
      try{
        window.Pi.createPayment({
          amount:Number(amount),
          memo:memo||`ALBUKHR ${code} investment`,
          metadata
        },{
          onReadyForServerApproval:async paymentId=>{
            try{
              await api().post("/api/pi-payment-approve",{
                payment_id:paymentId,project_code:code,amount:Number(amount),duration:Number(duration)
              });
            }catch(error){done(reject,error);}
          },
          onReadyForServerCompletion:async(paymentId,txid)=>{
            try{
              const result=await api().post("/api/pi-payment-complete",{
                payment_id:paymentId,txid,project_code:code,amount:Number(amount),duration:Number(duration)
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
      const input=validate(project,amount,duration);
      await auth();
      const result=await startPiPayment({
        amount:input.amount,
        duration:input.duration,
        projectCode:input.code,
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
    catch(error){console.warn("ALBUKHR project stakes unavailable:",error);return []}
  }

  async function getProjectTotals(project){
    const rows=await getProjectStakes(project);
    return rows.reduce((out,row)=>{
      out.stake+=Number(row.amount)||0;
      out.reward+=Number(row.reward_amount)||0;
      return out;
    },{stake:0,reward:0});
  }

  function getMinStake(project){return minStake(project);}
  function getRewardRate(project,duration){
    const c=cfg(project);const rates=c?.reward_rates||{};const r=Number(rates[String(duration)]);return Number.isFinite(r)?r:0;
  }

  window.AlbukhrStaking=Object.freeze({addStake,startPiPayment,getAllStakesMerged,getProjectStakes,getProjectTotals,getMinStake,getRewardRate});
  window.addStake=addStake;
  window.startPiPayment=startPiPayment;
  window.getAllStakesMerged=getAllStakesMerged;
  window.getProjectStakes=getProjectStakes;
  window.getProjectTotals=getProjectTotals;
  window.getMinStake=getMinStake;
})(window);
