/* =====================================
   ADMIN – ESCROW CONTROL
===================================== */

function releaseEscrow(projectId){
  const gate = adminCanProceed("escrow_release");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const escrow = getEscrow();
  const record = escrow.records.find(
    r => r.projectId === projectId && r.status === "locked"
  );

  if(!record){
    alert("No active escrow found.");
    return;
  }

  record.status = "released";
  escrow.totalLocked -= record.amount;

  saveEscrow(escrow);

  alert("Escrow released successfully.");
}

function refundEscrow(projectId){
  const gate = adminCanProceed("escrow_refund");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const escrow = getEscrow();
  const record = escrow.records.find(
    r => r.projectId === projectId && r.status === "locked"
  );

  if(!record){
    alert("No active escrow found.");
    return;
  }

  const wallet = getWallet();
  wallet.balance += record.amount;

  wallet.transactions.push({
    type:"escrow_refund",
    amount:record.amount,
    projectId,
    at:Date.now()
  });

  saveWallet(wallet);

  record.status = "refunded";
  escrow.totalLocked -= record.amount;

  saveEscrow(escrow);

  alert("Escrow refunded to wallet.");
}
