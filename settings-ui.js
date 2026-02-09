/* ===============================
   SETTINGS UI
================================ */

document.addEventListener("DOMContentLoaded",()=>{

  const settings = getSettings();

  const twoFA = document.getElementById("twoFA");
  const biometric = document.getElementById("biometric");
  const encryption = document.getElementById("encryption");

  if(twoFA) twoFA.checked = settings.twoFA;
  if(biometric) biometric.checked = settings.biometric;
  if(encryption) encryption.checked = settings.encryption;

  if(twoFA){
    twoFA.onchange = ()=> updateSetting("twoFA", twoFA.checked);
  }

  if(biometric){
    biometric.onchange = ()=> updateSetting("biometric", biometric.checked);
  }

  if(encryption){
    encryption.onchange = ()=> updateSetting("encryption", encryption.checked);
  }

});
