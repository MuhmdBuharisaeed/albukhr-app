AUTO_SETTLEMENT_LIMIT = 200
ADMIN_APPROVAL_LIMIT = 500

function approveWithdrawal(withdrawId){

const gate =
adminCanProceed("pi_withdraw_approve");

if(!gate.allowed){
alert(gate.message);
return;
}

const list =
JSON.parse(
localStorage.getItem(WITHDRAW_KEY)
) || [];

const req =
list.find(w => w.id === withdrawId);

if(!req){
alert("Request not found.");
return;
}

/* DOUBLE APPROVAL PROTECTION */

if(req.status !== "pending"){
alert("Already processed.");
return;
}

/* ADMIN WALLET CHECK */

if(typeof getAdminTreasury === "function"){

const treasury =
getAdminTreasury();

if(treasury.treasury < req.amount){
alert("Insufficient admin liquidity");
return;
}

}

/* APPROVE */

req.status = "approved";

req.approvedAt = Date.now();

req.approvedBy =
getAdminRole
? getAdminRole()
: "admin";

req.settlementStatus = "pending";

/* SAVE */

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)
);

/* RECORD TRANSACTION */

if(typeof recordTx === "function"){

recordTx({
type:"withdraw_approved",
project:req.project,
amount:req.amount,
meta:{
withdrawId:withdrawId
}
});

}

/* LARGE WITHDRAW WARNING */

if(req.amount >= 500){

alert(
"⚠️ Large withdrawal approved.\n\n" +
"Manual Pi settlement recommended."
);

}else{

alert(
"Withdrawal approved.\n" +
"Ready for Pi settlement."
);

}

}

function settleWithdrawal(withdrawId){

const list =
JSON.parse(
localStorage.getItem(WITHDRAW_KEY)
) || [];

const req =
list.find(w => w.id === withdrawId);

if(!req) return;

if(req.status !== "approved" &&
req.status !== "pending"){
return;
}

/* AUTO SETTLEMENT */

if(req.amount < 200){

req.status = "settled";
req.settledAt = Date.now();
req.settledBy = "auto-engine";

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)
);

/* RECORD */

recordTx({
type:"pi_settlement_auto",
project:req.project,
amount:req.amount
});

return;

}

/* REQUIRE ADMIN */

if(req.amount >= 500){

req.settlementStatus = "admin_required";

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)
);

return;

}

/* MEDIUM RANGE */

req.status = "queued";

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)

);

}

function confirmSettlement(){

const list =
JSON.parse(
localStorage.getItem(WITHDRAW_KEY)
) || [];

list.forEach(req=>{

if(req.status === "queued"){

req.status = "settled";
req.settledAt = Date.now();
req.settledBy = "auto-engine";

recordTx({
type:"pi_settlement",
project:req.project,
amount:req.amount
});

}

});

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)
);

}

setInterval(()=>{

confirmSettlement();

},5000);
