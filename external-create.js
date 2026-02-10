function submitExternalProject(data){

  const gate = albukhrCanProceed("external_create");

  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  saveExternalProject(data);

  alert(
    "✅ Project submitted successfully.\n" +
    "Please join the ALBUKHR External Projects Telegram group."
  );
}

function submitExternalProject(data){

  const gate = albukhrCanProceed("external_create");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  const escrowAmount = Number(data.escrowAmount || 0);

  if(escrowAmount > 0){
    const locked = lockToEscrow(data.projectId, escrowAmount);
    if(!locked) return;
  }

  saveExternalProject(data);

  alert(
    "✅ Project submitted successfully.\n" +
    "Funds are securely locked in escrow."
  );
}
