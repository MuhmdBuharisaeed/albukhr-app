/* ALBUKHR UNIFIED TRANSACTIONS v3 — server-authoritative only */
(function(window){
"use strict";
async function getAllTransactionsUnified(){
 try{
  const stakes=typeof window.getAllStakesMerged==="function"?await window.getAllStakesMerged():[];
  return (Array.isArray(stakes)?stakes:[]).map(x=>({...x,source:x.source||"mainnet"})).sort((a,b)=>new Date(b.created_at||b.timestamp||0)-new Date(a.created_at||a.timestamp||0));
 }catch(e){console.warn("Unified transactions unavailable:",e);return []}
}
window.getAllTransactionsUnified=getAllTransactionsUnified;
})(window);
