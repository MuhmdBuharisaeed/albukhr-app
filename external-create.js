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
