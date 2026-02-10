/* =====================================
   ALBUKHR WALLET – WITHDRAWAL ENGINE
===================================== */

const WITHDRAW_KEY = "albukhr_withdraw_requests";

/* INIT */
function initWithdrawals(){
  if(!localStorage.getItem(WITHDRAW_KEY)){
    localStorage.setItem(WITHDRAW_KEY, JSON.stringify([]));
  }
}

/* REQUEST WITHDRAWAL */
function requestPiWithdrawal(amount, piAddress){
  const gate = walletCanOperate();
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  if(!amount || amount <= 0){
    alert("Invalid withdrawal amount.");
    return;
  }

  const wallet = getWallet();
  if(wallet.balance < amount){
    alert("Insufficient balance.");
    return;
  }

  // Deduct immediately (escrow-like)
  wallet.balance -= amount;
  wallet.transactions.push({
    type:"withdraw_request",
    amount,
    to:"pi_wallet",
    at:Date.now()
  });
  saveWallet(wallet);

  const list = JSON.parse(localStorage.getItem(WITHDRAW_KEY));
  list.push({
    id:"WD-" + Date.now(),
    amount,
    piAddress,
    status:"pending", // pending | approved | sent | failed
    requestedAt:Date.now()
  });

  localStorage.setItem(WITHDRAW_KEY, JSON.stringify(list));

  alert("Withdrawal request submitted. Processing may take time.");
}
