document.addEventListener("DOMContentLoaded",()=>{

  const gate = adminCanProceed("withdraw_dashboard");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  renderAdminWithdrawals();
});

function renderAdminWithdrawals(){
  const box = document.getElementById("adminWithdrawList");
  const list = JSON.parse(localStorage.getItem("albukhr_withdraw_requests")) || [];

  box.innerHTML = "";

  if(!list.length){
    box.innerHTML = "<small>No withdrawal requests.</small>";
    return;
  }

  list.forEach(w=>{
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <b>${w.amount} PI</b><br>
      <small>${w.piAddress}</small><br>
      <b>Status:</b> ${w.status}<br>
      <button class="approve" onclick="setWithdrawStatus('${w.id}','approved')">Approve</button>
      <button class="sent" onclick="setWithdrawStatus('${w.id}','sent')">Mark Sent</button>
      <button class="fail" onclick="setWithdrawStatus('${w.id}','failed')">Fail</button>
    `;
    box.appendChild(div);
  });
}

function setWithdrawStatus(id,status){
  const gate = adminCanProceed("withdraw_update");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const list = JSON.parse(localStorage.getItem("albukhr_withdraw_requests")) || [];
  const req = list.find(w=>w.id===id);

  if(!req){
    alert("Request not found.");
    return;
  }

  req.status = status;
  localStorage.setItem("albukhr_withdraw_requests", JSON.stringify(list));

  alert("Withdrawal status updated.");
  renderAdminWithdrawals();
}
