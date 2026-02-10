document.addEventListener("DOMContentLoaded",()=>{
  const gate = adminCanProceed("escrow_dashboard");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }
  renderAdminEscrow();
});

function renderAdminEscrow(){
  const escrow = getEscrow();
  const box = document.getElementById("adminEscrowList");
  box.innerHTML = "";

  escrow.records.forEach(r=>{
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <b>Project:</b> ${r.projectId}<br>
      <b>Amount:</b> ${r.amount}<br>
      <b>Status:</b> ${r.status}<br>
      <button class="btn release" onclick="releaseEscrow('${r.projectId}')">Release</button>
      <button class="btn refund" onclick="refundEscrow('${r.projectId}')">Refund</button>
    `;
    box.appendChild(div);
  });
}
