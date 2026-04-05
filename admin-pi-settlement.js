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

/* AUTO APPROVAL */

if(req.amount < AUTO_SETTLEMENT_LIMIT){

req.status = "approved";
req.autoApproved = true;

}

/* REQUIRE ADMIN */

if(req.amount >= ADMIN_APPROVAL_LIMIT){

req.status = "approved";

}

/* MEDIUM */

if(
req.amount >= AUTO_SETTLEMENT_LIMIT &&
req.amount < ADMIN_APPROVAL_LIMIT
){

req.status = "approved";

}

req.approvedAt = Date.now();

req.approvedBy =
getAdminRole
? getAdminRole()
: "admin";

req.settlementStatus = "pending";

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)
);

if(typeof recordTx === "function"){

recordTx({
type:"withdraw_approved",
project:req.project,
amount:req.amount,
meta:{withdrawId:withdrawId}
});

}

alert("Withdrawal approved");

}

function settleWithdrawal(withdrawId){

const list =
JSON.parse(
localStorage.getItem(WITHDRAW_KEY)
) || [];

const req =
list.find(w => w.id === withdrawId);

if(!req) return;

if(req.status !== "approved") return;

/* AUTO */

if(req.amount < AUTO_SETTLEMENT_LIMIT){

req.status = "settled";
req.settledAt = Date.now();
req.settledBy = "auto-engine";

}

/* MEDIUM */

if(
req.amount >= AUTO_SETTLEMENT_LIMIT &&
req.amount < ADMIN_APPROVAL_LIMIT
){

req.status = "queued";

}

/* LARGE */

if(req.amount >= ADMIN_APPROVAL_LIMIT){

req.settlementStatus = "admin_required";

}

localStorage.setItem(
WITHDRAW_KEY,
JSON.stringify(list)
);

if(typeof recordTx === "function"){

recordTx({
type:"pi_settlement",
project:req.project,
amount:req.amount
});

}

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

const list =
JSON.parse(
localStorage.getItem(WITHDRAW_KEY)
) || [];

list.forEach(req=>{

if(req.status === "approved"){

settleWithdrawal(req.id);

}

});

confirmSettlement();

},4000);
