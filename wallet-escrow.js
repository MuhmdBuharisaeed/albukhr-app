/* =====================================
   ALBUKHR WALLET – ESCROW ENGINE
===================================== */

const ESCROW_KEY = "albukhr_escrow_pool";

const defaultEscrow = {
  totalLocked: 0,
  records: []   // each project escrow
};

/* INIT */
function initEscrow(){
  if(!localStorage.getItem(ESCROW_KEY)){
    localStorage.setItem(
      ESCROW_KEY,
      JSON.stringify(defaultEscrow)
    );
  }
}

/* GET */
function getEscrow(){
  return {
    ...defaultEscrow,
    ...JSON.parse(localStorage.getItem(ESCROW_KEY) || "{}")
  };
}

/* SAVE */
function saveEscrow(escrow){
  localStorage.setItem(ESCROW_KEY, JSON.stringify(escrow));
}

/* LOCK FUNDS INTO ESCROW */
function lockToEscrow(projectId, amount, fromUser="user"){
  const check = walletCanOperate();
  if(!check.allowed){
    alert(check.message);
    return false;
  }

  const wallet = getWallet();
  if(wallet.balance < amount){
    alert("Insufficient balance for escrow.");
    return false;
  }

  wallet.balance -= amount;

  wallet.transactions.push({
    type:"escrow_lock",
    amount,
    projectId,
    at:Date.now()
  });

  saveWallet(wallet);

  const escrow = getEscrow();
  escrow.totalLocked += amount;

  escrow.records.push({
    projectId,
    amount,
    status:"locked", // locked | released | refunded
    fromUser,
    at:Date.now()
  });

  saveEscrow(escrow);
  return true;
}
