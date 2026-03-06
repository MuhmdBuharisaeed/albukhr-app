/* =====================================
   ALBUKHR WALLET UI
===================================== */

document.addEventListener("DOMContentLoaded",()=>{

  initWallet();

  refreshWalletUI();

  document.getElementById("receiveBtn").onclick = ()=>{
    walletReceive(10,"demo");   // demo receive
    refreshWalletUI();
  };

  document.getElementById("sendBtn").onclick = ()=>{
    const amount = prompt("Enter amount to send:");
    if(!amount) return;
    walletSend(Number(amount),"external");
    refreshWalletUI();
  };

});

function refreshWalletUI(){

  const wallet = openWallet();
  if(!wallet) return;

  document.getElementById("walletBalance").innerText =
    wallet.balance + " " + wallet.currency;

  const txList = document.getElementById("txList");
  txList.innerHTML = "";

  wallet.transactions.slice().reverse().forEach(tx=>{
    const div = document.createElement("div");
    div.className = "tx";
    div.innerHTML = `
      <b>${tx.type.toUpperCase()}</b> — ${tx.amount}
      <br><small>${new Date(tx.at).toLocaleString()}</small>
    `;
    txList.appendChild(div);
  });

}
