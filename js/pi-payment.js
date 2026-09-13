/* ALBUKHR PI PAYMENT v3 — Mainnet-safe */
(function(window){
"use strict";
async function startPiPayment({amount,memo,stakeId,projectCode,duration}={}){
 if(!window.AlbukhrPiAuth)throw new Error("Pi Auth Core is required.");
 const u=await window.AlbukhrPiAuth.ensurePiAuth();if(!u?.pi_uid)throw new Error("Pi login required.");
 if(u.network!=="mainnet")throw new Error("Mainnet payment cannot run from Testnet.");
 if(!window.Pi?.createPayment)throw new Error("Pi SDK payment API unavailable.");
 return new Promise((resolve,reject)=>{
  window.Pi.createPayment({amount,memo,metadata:{userId:u.pi_uid,stakeId,project_code:projectCode||null,duration:duration||null,network:"mainnet",action:"add_liquidity"}},{
   onReadyForServerApproval:id=>console.warn("Payment requires server approval:",id),
   onReadyForServerCompletion:(id,txid)=>resolve({paymentId:id,txid}),
   onCancel:()=>reject(new Error("User cancelled payment.")),
   onError:e=>reject(e)
  });
 });
}
window.startPiPayment=startPiPayment;
})(window);
