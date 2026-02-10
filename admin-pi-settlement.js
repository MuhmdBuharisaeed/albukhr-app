function approveWithdrawal(withdrawId){
  const gate = adminCanProceed("pi_withdraw_approve");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const list = JSON.parse(localStorage.getItem(WITHDRAW_KEY));
  const req = list.find(w => w.id === withdrawId);

  if(!req || req.status !== "pending"){
    alert("Invalid request.");
    return;
  }

  req.status = "approved";
  localStorage.setItem(WITHDRAW_KEY, JSON.stringify(list));

  alert("Withdrawal approved. Ready for Pi settlement.");
}
