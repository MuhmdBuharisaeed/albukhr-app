/* ===============================
ALBUKHR CORE – GATE AUTHORITY
================================ */

function albukhrCanProceed(action){

const raw =
typeof getSettings === "function"
? getSettings()
: {};

const settings = {

systemStatus: raw.systemStatus || "active",
encryption: raw.encryption ?? true,
twoFA: raw.twoFA ?? false,
biometric: raw.biometric ?? false,
acceptedPolicies: raw.acceptedPolicies ?? true

};

/* SYSTEM FREEZE */

if(settings.systemStatus === "frozen"){
return deny(
"System temporarily locked for security review."
);
}

/* ENCRYPTION */

if(!settings.encryption){
return deny(
"Encryption must be enabled to continue."
);
}

/* HIGH RISK ACTIONS */

const highRisk = [

"withdraw",
"settlement",
"admin_action",
"wallet_transfer"

];

/* SECURITY */

if(highRisk.includes(action)){

if(!settings.twoFA && !settings.biometric){

return deny(
"Enable 2FA or biometric security for this action."
);

}

}

/* COMPLIANCE */

if(!settings.acceptedPolicies){

return deny(
"Please review and accept ALBUKHR policies."
);

}

return { allowed:true };

}

/* ===============================
DENY
=============================== */

function deny(message){
return {
allowed:false,
message
};
}
