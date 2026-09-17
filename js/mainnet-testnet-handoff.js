/* ALBUKHR Mainnet -> Testnet Auth Handoff
   Mainnet only. Keeps Pi access token in memory and never puts it in a URL. */
(function(window){"use strict";
  const ISSUER_URL="https://ribpntyqdleytsyktdfb.supabase.co/functions/v1/testnet-auth-issuer";
  const TESTNET_ORIGIN="https://test.albukhr.com";
  function target(){
    const p=new URLSearchParams(location.search);
    return p.get("returnTo")==="testnet" ? TESTNET_ORIGIN+"/" : null;
  }
  async function handoffToTestnet(){
    const url=target(); if(!url) return false;
    const auth=window.AlbukhrPiAuth;
    if(!auth || typeof auth.getAccessToken!=="function") throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    const token=auth.getAccessToken();
    if(!token) throw new Error("Pi access token is unavailable. Authenticate again.");
    const res=await fetch(ISSUER_URL,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:"{}"});
    let body=null; try{body=await res.json();}catch{}
    if(!res.ok || !body || !body.code) throw new Error(body?.error || "Testnet access code could not be issued.");
    const destination=new URL(url); destination.searchParams.set("access_code",body.code);
    window.location.replace(destination.toString());
    return true;
  }
  window.AlbukhrTestnetHandoff=Object.freeze({handoffToTestnet});
})(window);
