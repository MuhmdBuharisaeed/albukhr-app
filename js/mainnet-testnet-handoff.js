/* ALBUKHR Mainnet -> Testnet authenticated handoffs.
   Mainnet Pi access tokens remain memory-only and are sent only to Mainnet issuers.
*/
(function(window){ "use strict";
  const ISSUER_URL="https://ribpntyqdleytsyktdfb.supabase.co/functions/v1/testnet-auth-issuer";
  const OWNER_PROOF_ISSUER_URL="https://ribpntyqdleytsyktdfb.supabase.co/functions/v1/testnet-project-owner-proof-issuer";
  const MAINNET_ORIGIN="https://app.albukhr.com";
  const TESTNET_ORIGIN="https://test.albukhr.com";

  function isTestnetReturn(){
    return new URLSearchParams(window.location.search).get("returnTo")==="testnet";
  }

  function requireMainnetAuth(){
    if(window.location.origin!==MAINNET_ORIGIN)
      throw new Error("MAINNET_HANDOFF_ORIGIN_INVALID");
    const environment=window.ALBukhrEnvironment;
    if(!environment||typeof environment.isMainnet!=="function"||!environment.isMainnet())
      throw new Error("MAINNET_ENVIRONMENT_REQUIRED");
    const auth=window.AlbukhrPiAuth;
    if(!auth||typeof auth.getAccessToken!=="function")
      throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    const token=auth.getAccessToken();
    if(!token) throw new Error("Pi access token is unavailable. Authenticate again.");
    return token;
  }

  async function handoffToTestnet(){
    if(!isTestnetReturn()) return false;
    const token=requireMainnetAuth();
    const res=await fetch(ISSUER_URL,{
      method:"POST",
      mode:"cors",
      credentials:"omit",
      cache:"no-store",
      redirect:"error",
      headers:{
        "Authorization":"Bearer "+token,
        "Content-Type":"application/json",
        "Accept":"application/json"
      },
      body:"{}"
    });
    let body=null;
    try{ body=await res.json(); }catch(_){}
    if(!res.ok||!body||!body.code)
      throw new Error(body?.error||"Testnet access code could not be issued.");

    const destination=new URL(TESTNET_ORIGIN+"/");
    destination.searchParams.set("access_code",body.code);
    window.location.replace(destination.toString());
    return true;
  }

  async function issueProjectOwnerProof(projectCode){
    const code=String(projectCode||"").trim().toUpperCase();
    if(!/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(code))
      throw new Error("OWNER_PROOF_PROJECT_CODE_INVALID");
    const token=requireMainnetAuth();
    const res=await fetch(OWNER_PROOF_ISSUER_URL,{
      method:"POST",
      mode:"cors",
      credentials:"omit",
      cache:"no-store",
      redirect:"error",
      headers:{
        "Authorization":"Bearer "+token,
        "Content-Type":"application/json",
        "Accept":"application/json"
      },
      body:JSON.stringify({action:"issue",project_code:code})
    });
    let body=null;
    try{ body=await res.json(); }catch(_){}
    if(!res.ok||!body||body.ok!==true||!body.proof)
      throw new Error(body?.error||"MAINNET_OWNER_PROOF_ISSUE_FAILED");
    if(String(body.proof).length>4096)
      throw new Error("MAINNET_OWNER_PROOF_SIZE_INVALID");

    // The destination is fixed to Testnet; no caller-supplied redirect is accepted.
    // The short-lived signed proof is carried only in the URL fragment, never in
    // the query string or HTTP request. Testnet removes the fragment immediately.
    const destination=new URL(TESTNET_ORIGIN+"/project.html");
    destination.searchParams.set("project",code);
    destination.hash="albukhr_owner_proof="+encodeURIComponent(body.proof);
    body.proof="";
    window.location.replace(destination.toString());
    return true;
  }

  window.AlbukhrTestnetHandoff=Object.freeze({
    isTestnetReturn,
    handoffToTestnet,
    issueProjectOwnerProof
  });
})(window);
