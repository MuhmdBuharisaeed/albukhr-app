/* ALBUKHR TRANSACTION ENGINE v3 — no browser ledger */
(function(window){
"use strict";
function getCurrentUser(){return window.AlbukhrPiAuth?.getUser?.()||null}
async function getTransactions(){const u=await window.AlbukhrPiAuth?.ensurePiAuth?.();if(!u)return [];return window.getAllTransactionsUnified?window.getAllTransactionsUnified():[]}
async function recordTx(){return {error:"Browser transaction recording is disabled. Financial records are server-authoritative."}}
window.getCurrentUser=getCurrentUser;window.getTransactions=getTransactions;window.recordTx=recordTx;
window.getTxByProject=async p=>(await getTransactions()).filter(x=>x.project===p);
window.getTxByType=async t=>(await getTransactions()).filter(x=>x.type===t);
window.getRecentTx=async l=>(await getTransactions()).slice(0,l||20);
})(window);
