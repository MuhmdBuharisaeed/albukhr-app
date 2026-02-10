function openWallet(){
  const gate = albukhrCanProceed("wallet");

  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  // wallet logic here
}
