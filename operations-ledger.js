const OPS_KEY = "albukhr_operations_fund";

function creditOperations(amount){
  const gate = ledgerGate("operations_credit");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const total = (Number(localStorage.getItem(OPS_KEY)) || 0) + amount;
  localStorage.setItem(OPS_KEY, total);

  ledgerLog("OPERATIONS_CREDIT",{amount,total});
}
