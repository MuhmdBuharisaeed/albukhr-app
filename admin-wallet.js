/* =====================================
   ALBUKHR ADMIN – WALLET MONITOR v2
   Unified Wallet Engine Compatible
===================================== */

document.addEventListener("DOMContentLoaded",()=>{

  const gate = adminCanProceed("wallet_monitor");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  refreshAdminWallet();

  document.getElementById("lockWalletBtn").onclick = lockWalletSystem;
  document.getElementById("unlockWalletBtn").onclick = unlockWalletSystem;

  /* 🔄 Auto refresh when wallet updates */
  window.addEventListener("walletUpdated", refreshAdminWallet);

});

/* =====================================
   SAFE GET WALLET
===================================== */
function safeGetWallet(){

  const wallet = getWallet();

  if(!wallet){
    return null;
  }

  /* Ensure transactions array exists */
  if(!Array.isArray(wallet.transactions)){
    wallet.transactions = [];
  }

  return wallet;
}

/* =====================================
   REFRESH VIEW
===================================== */
function refreshAdminWallet(){

  const wallet = safeGetWallet();
  if(!wallet) return;

  document.getElementById("adminBalance").innerText =
    wallet.balance + " " + wallet.currency;

  document.getElementById("walletStatus").innerText =
    wallet.status.toUpperCase();

  const list = document.getElementById("adminTxList");
  list.innerHTML = "";

  if(!wallet.transactions.length){
    list.innerHTML = "<small>No transactions yet</small>";
    return;
  }

  wallet.transactions
    .slice()
    .reverse()
    .forEach(tx=>{

      const div = document.createElement("div");
      div.className = "tx";

      div.innerHTML = `
        <b>${(tx.type || "TX").toUpperCase()}</b>
        — ${tx.amount} ${wallet.currency}
        ${tx.address ? `<br><small>To: ${tx.address}</small>` : ""}
        <br><small>${new Date(tx.at || Date.now()).toLocaleString()}</small>
      `;

      list.appendChild(div);

    });
}

/* =====================================
   LOCK SYSTEM
===================================== */
function lockWalletSystem(){

  const gate = adminCanProceed("wallet_lock");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const wallet = safeGetWallet();
  if(!wallet) return;

  wallet.status = "locked";
  saveWallet(wallet);

  alert("Wallet system locked successfully.");
  refreshAdminWallet();
}

/* =====================================
   UNLOCK SYSTEM
===================================== */
function unlockWalletSystem(){

  const gate = adminCanProceed("wallet_unlock");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const wallet = safeGetWallet();
  if(!wallet) return;

  wallet.status = "active";
  saveWallet(wallet);

  alert("Wallet system unlocked.");
  refreshAdminWallet();
}
