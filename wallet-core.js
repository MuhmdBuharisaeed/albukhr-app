/* =====================================
   ALBUKHR WALLET CORE ENGINE
   ===================================== */

const WALLET_KEY = "albukhr_wallet_core";

/* DEFAULT WALLET STATE */
const defaultWallet = {
  balance: 0,
  currency: "PI",        // PI | USDT | future
  status: "active",      // active | locked
  transactions: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

/* INIT WALLET */
function initWallet(){
  if(!localStorage.getItem(WALLET_KEY)){
    localStorage.setItem(
      WALLET_KEY,
      JSON.stringify(defaultWallet)
    );
  }
}

/* GET WALLET */
function getWallet(){
  try{
    return {
      ...defaultWallet,
      ...JSON.parse(localStorage.getItem(WALLET_KEY))
    };
  }catch{
    return { ...defaultWallet };
  }
}

/* SAVE WALLET */
function saveWallet(wallet){
  wallet.updatedAt = Date.now();
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
}

/* SECURITY CHECK */
function walletCanOperate(){
  const gate = albukhrCanProceed("wallet");
  if(!gate.allowed){
    return gate;
  }

  const wallet = getWallet();
  if(wallet.status === "locked"){
    return {
      allowed:false,
      message:"Wallet is temporarily locked for security review."
    };
  }

  return { allowed:true };
}

/* OPEN WALLET */
function openWallet(){
  const check = walletCanOperate();
  if(!check.allowed){
    alert(check.message);
    return null;
  }

  initWallet();
  return getWallet();
}

/* BALANCE */
function getWalletBalance(){
  const check = walletCanOperate();
  if(!check.allowed){
    alert(check.message);
    return null;
  }
  return getWallet().balance;
}

/* RECEIVE FUNDS (SYSTEM / ESCROW / FUTURE) */
function walletReceive(amount, source="system"){
  const check = walletCanOperate();
  if(!check.allowed){
    alert(check.message);
    return;
  }

  if(amount <= 0) return;

  const wallet = getWallet();
  wallet.balance += amount;

  wallet.transactions.push({
    type:"receive",
    amount,
    source,
    at:Date.now()
  });

  saveWallet(wallet);
}

/* SEND FUNDS (FUTURE – USER CONFIRMATION REQUIRED) */
function walletSend(amount, destination){
  const check = walletCanOperate();
  if(!check.allowed){
    alert(check.message);
    return;
  }

  const wallet = getWallet();

  if(amount <= 0){
    alert("Invalid amount.");
    return;
  }

  if(wallet.balance < amount){
    alert("Insufficient balance.");
    return;
  }

  wallet.balance -= amount;

  wallet.transactions.push({
    type:"send",
    amount,
    destination,
    at:Date.now()
  });

  saveWallet(wallet);
}

/* TRANSACTION HISTORY */
function getWalletTransactions(){
  const check = walletCanOperate();
  if(!check.allowed){
    alert(check.message);
    return [];
  }
  return getWallet().transactions;
}
