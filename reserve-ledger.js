const RESERVE_KEY = "albukhr_project_reserve";

function creditProjectReserve(projectId, amount){
  const gate = ledgerGate("reserve_credit");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const data = JSON.parse(localStorage.getItem(RESERVE_KEY)) || {};
  data[projectId] = (data[projectId] || 0) + amount;

  localStorage.setItem(RESERVE_KEY, JSON.stringify(data));
  ledgerLog("RESERVE_CREDIT",{projectId,amount});
}
