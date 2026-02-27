/* =====================================
   ALBUKHR ADMIN – WALLET MONITOR
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

});

/* REFRESH VIEW */
function refreshAdminWallet(){

  const wallet = getWallet();
  if(!wallet) return;

  document.getElementById("adminBalance").innerText =
    wallet.balance + " " + wallet.currency;

  document.getElementById("walletStatus").innerText =
    wallet.status.toUpperCase();

  const list = document.getElementById("adminTxList");
  list.innerHTML = "";

  wallet.transactions.slice().reverse().forEach(tx=>{
    const div = document.createElement("div");
    div.className = "tx";
    div.innerHTML = `
      <b>${tx.type.toUpperCase()}</b> — ${tx.amount}
      <br><small>${new Date(tx.at).toLocaleString()}</small>
    `;
    list.appendChild(div);
  });
}

/* LOCK SYSTEM */
function lockWalletSystem(){
  const gate = adminCanProceed("wallet_lock");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const wallet = getWallet();
  wallet.status = "locked";
  saveWallet(wallet);

  alert("Wallet system locked successfully.");
  refreshAdminWallet();
}

/* UNLOCK SYSTEM */
function unlockWalletSystem(){
  const gate = adminCanProceed("wallet_unlock");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const wallet = getWallet();
  wallet.status = "active";
  saveWallet(wallet);

  alert("Wallet system unlocked.");
  refreshAdminWallet();
    }
