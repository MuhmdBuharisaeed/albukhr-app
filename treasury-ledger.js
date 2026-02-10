const TREASURY_KEY = "albukhr_treasury_ledger";

function getTreasury(){
  return JSON.parse(localStorage.getItem(TREASURY_KEY)) || 0;
}

function creditTreasury(amount){
  const gate = ledgerGate("treasury_credit");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const total = getTreasury() + amount;
  localStorage.setItem(TREASURY_KEY, total);

  ledgerLog("TREASURY_CREDIT",{amount,total});
}
