document.addEventListener("DOMContentLoaded",()=>{

  initWithdrawals();

  document.getElementById("withdrawBtn").onclick = ()=>{
    const amount = Number(document.getElementById("wdAmount").value);
    const address = document.getElementById("piAddress").value.trim();

    if(!address){
      alert("Pi wallet address is required.");
      return;
    }

    requestPiWithdrawal(amount, address);
    renderUserWithdrawals();
  };

  renderUserWithdrawals();
});

function renderUserWithdrawals(){
  const listBox = document.getElementById("withdrawList");
  const list = JSON.parse(localStorage.getItem("albukhr_withdraw_requests")) || [];

  listBox.innerHTML = "";

  if(!list.length){
    listBox.innerHTML = "<small>No withdrawal requests yet.</small>";
    return;
  }

  list.slice().reverse().forEach(w=>{
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <b>${w.amount} PI</b><br>
      <small>${w.piAddress}</small><br>
      <span class="badge ${w.status}">${w.status.toUpperCase()}</span><br>
      <small>${new Date(w.requestedAt).toLocaleString()}</small>
    `;
    listBox.appendChild(div);
  });
}
