const COMMUNITY_KEY = "albukhr_community_fund";

function creditCommunity(amount){
  const gate = ledgerGate("community_credit");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const total = (Number(localStorage.getItem(COMMUNITY_KEY)) || 0) + amount;
  localStorage.setItem(COMMUNITY_KEY, total);

  ledgerLog("COMMUNITY_CREDIT",{amount,total});
}
