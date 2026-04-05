function submitExternalProject(data){

/* ===============================
SECURITY GATE
=============================== */

const gate =
albukhrCanProceed("external_create");

if(!gate.allowed){
alert(gate.message);
return;
}

/* ===============================
ESCROW LOCK
=============================== */

const escrowAmount =
Number(data.escrowAmount || 0);

if(escrowAmount > 0){

const locked =
lockToEscrow(
data.projectId,
escrowAmount
);

if(!locked){
alert("Escrow lock failed");
return;
}

}

/* ===============================
DEFAULT STATUS
=============================== */

data.status = "pending";
data.telegramAccess = false;
data.createdAt = Date.now();

/* ===============================
SAVE PROJECT
=============================== */

saveExternalProject(data);

/* ===============================
SUCCESS MESSAGE
=============================== */

alert(
"✅ Project submitted successfully.\n\n" +
"Waiting for admin approval.\n" +
"Telegram access will unlock after approval."
);

}
