document.addEventListener("DOMContentLoaded",()=>{
  const gate = albukhrCanProceed("escrow_view");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }
  renderUserEscrow();
});

function renderUserEscrow(){
  const escrow = getEscrow();
  const box = document.getElementById("escrowList");
  box.innerHTML = "";

  if(!escrow.records.length){
    box.innerHTML = "<small>No escrow records yet.</small>";
    return;
  }

  escrow.records.forEach(r=>{
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <b>Project:</b> ${r.projectId}<br>
      <b>Amount:</b> ${r.amount}<br>
      <span class="badge ${r.status}">${r.status.toUpperCase()}</span><br>
      <small>${new Date(r.at).toLocaleString()}</small>
    `;
    box.appendChild(div);
  });
}
