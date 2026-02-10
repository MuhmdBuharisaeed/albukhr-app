/* =====================================
   ALBUKHR LEDGER CORE
===================================== */

function ledgerGate(action){
  return adminCanProceed("ledger_" + action);
}

function ledgerLog(type, data){
  console.log("[LEDGER]", type, data);
  // future: send to audit trail
}
