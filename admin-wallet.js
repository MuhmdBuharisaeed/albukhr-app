function openAdminPanel(){
  const gate = albukhrCanProceed("admin");

  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  // admin dashboard
}
