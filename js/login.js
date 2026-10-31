/* ALBUKHR MAINNET LOGIN PAGE CONTROLLER */
(function(window){ "use strict";
  function el(id){return document.getElementById(id)}
  function clean(value){return String(value==null?"":value).trim()}
  function setStatus(message){const e=el("status");if(e)e.textContent=String(message||"")}
  function setLoading(loading,text){
    const b=el("piLoginButton");if(!b)return;
    b.disabled=Boolean(loading);
    const t=b.querySelector(".pi-login-text");if(t&&typeof text==="string")t.textContent=text;
  }
  function checkDependencies(){
    if(!window.ALBukhrEnvironment||!window.ALBukhrEnvironment.isKnown())
      throw new Error("ALBUKHR environment is unavailable.");
    if(!window.ALBukhrEnvironment.isMainnet())
      throw new Error("Mainnet authentication is available only on the Mainnet domain.");
    if(!window.ALBUKHR_SUPABASE)
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    if(!window.AlbukhrPiAuth)
      throw new Error("ALBUKHR Pi Auth Core is unavailable.");
  }
  function params(){return new URLSearchParams(window.location.search)}
  function isTestnetReturn(){return params().get("returnTo")==="testnet"}
  function isOwnerProofReturn(){return params().get("returnTo")==="owner-proof"}
  function ownerProofProjectCode(){
    const value=clean(params().get("project_code")).toUpperCase();
    if(!/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(value))
      throw new Error("OWNER_PROOF_PROJECT_CODE_INVALID");
    return value;
  }
  function getTarget(){
    const r=params().get("returnTo");
    return r&&r.startsWith("/")&&!r.startsWith("//")?r:"index.html";
  }
  async function login(){
    try{
      checkDependencies();
      const ownerProofMode=isOwnerProofReturn();
      const projectCode=ownerProofMode?ownerProofProjectCode():"";
      setLoading(true,"Connecting to Pi...");
      setStatus(ownerProofMode
        ?"Verifying Mainnet ownership for "+projectCode+"..."
        :"Initializing secure Pi authentication...");

      const user=await window.AlbukhrPiAuth.ensurePiAuth();
      if(!user||!user.pi_uid)
        throw new Error("Pi authentication returned an invalid user.");

      if(ownerProofMode){
        const handoff=window.AlbukhrTestnetHandoff;
        if(!handoff||typeof handoff.issueProjectOwnerProof!=="function")
          throw new Error("Mainnet Owner proof handoff module is unavailable.");
        setStatus("Mainnet Pi identity verified. Issuing a short-lived ownership proof...");
        setLoading(true,"Verifying ownership...");
        await handoff.issueProjectOwnerProof(projectCode);
        return;
      }

      if(isTestnetReturn()){
        if(!window.AlbukhrTestnetHandoff)
          throw new Error("Testnet handoff module is unavailable.");
        setStatus("Mainnet Pi identity verified. Creating secure Testnet access...");
        setLoading(true,"Opening Testnet...");
        await window.AlbukhrTestnetHandoff.handoffToTestnet();
        return;
      }

      setStatus("Login successful: "+(user.username||user.pi_uid));
      setLoading(true,"Opening Dashboard...");
      window.setTimeout(()=>window.location.replace(getTarget()),600);
    }catch(error){
      console.error("[ALBUKHR LOGIN]",error);
      setLoading(false,isOwnerProofReturn()?"Verify ownership with Pi":"Login with Pi");
      setStatus(error&&error.message?"Login failed: "+error.message:"Login failed.");
    }
  }
  window.login=login;
  function init(){
    try{
      checkDependencies();
      if(isOwnerProofReturn()){
        const code=ownerProofProjectCode();
        setStatus("Ready to verify Mainnet ownership for "+code+". Continue with your Mainnet Pi account.");
        setLoading(false,"Verify project ownership");
      }else{
        setStatus(isTestnetReturn()
          ?"Ready to verify your Pi identity for Testnet."
          :"Ready to login with Pi.");
        setLoading(false,isTestnetReturn()?"Continue to Testnet":"Login with Pi");
      }
    }catch(error){
      console.error(error);
      setLoading(true,"Login unavailable");
      setStatus("Login system is unavailable.");
    }
  }
  document.readyState==="loading"
    ?document.addEventListener("DOMContentLoaded",init,{once:true})
    :init();
})(window);
