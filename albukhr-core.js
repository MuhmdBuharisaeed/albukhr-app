/* ===============================
   ALBUKHR CORE – GATE AUTHORITY
================================ */

function albukhrCanProceed(action){
  const settings = getSettings(); // daga settings-core.js

  /* SYSTEM LEVEL */
  if(settings.systemStatus === "frozen"){
    return deny("System temporarily locked for security review.");
  }

  /* SECURITY LEVEL */
  if(!settings.encryption){
    return deny("Encryption must be enabled to continue.");
  }

  if(action !== "view"){
    if(!settings.twoFA && !settings.biometric){
      return deny("Enable 2FA or biometric security to proceed.");
    }
  }

  /* COMPLIANCE */
  if(!settings.acceptedPolicies){
    return deny("Please review and accept ALBUKHR policies.");
  }

  return { allowed:true };
}

function deny(message){
  return { allowed:false, message };
}
