const TREASURY_KEY = "albukhr_treasury_ledger";
const TREASURY_HISTORY = "albukhr_treasury_history";

/* ===============================
GET TREASURY
=============================== */

function getTreasury(){

return Number(
localStorage.getItem(TREASURY_KEY)
) || 0;

}

/* ===============================
CREDIT TREASURY
=============================== */

function creditTreasury(amount){

const gate =
typeof ledgerGate === "function"
? ledgerGate("treasury_credit")
: {allowed:true};

if(!gate.allowed){
alert(gate.message);
return;
}

/* VALIDATION */

amount = Number(amount);

if(!amount || amount <= 0){
alert("Invalid treasury amount");
return;
}

/* CALCULATE */

let total = getTreasury();

total += amount;

/* SAVE */

localStorage.setItem(
TREASURY_KEY,
total.toFixed(2)
);

/* HISTORY */

const history =
JSON.parse(
localStorage.getItem(TREASURY_HISTORY)
) || [];

history.push({

type:"credit",
amount:amount,
total:total,
timestamp:Date.now(),
admin:
typeof getAdminRole === "function"
? getAdminRole()
: "system"

});

localStorage.setItem(
TREASURY_HISTORY,
JSON.stringify(history)
);

/* LEDGER */

if(typeof ledgerLog === "function"){

ledgerLog(
"TREASURY_CREDIT",
{amount,total}
);

}

/* UNIFIED TX */

if(typeof recordTx === "function"){

recordTx({
type:"treasury_credit",
project:"treasury",
amount:amount
});

}

}

function debitTreasury(amount){

amount = Number(amount);

if(!amount || amount <= 0){
return false;
}

let total = getTreasury();

if(total < amount){
return false;
}

total -= amount;

localStorage.setItem(
TREASURY_KEY,
total.toFixed(2)
);

ledgerLog(
"TREASURY_DEBIT",
{amount,total}
);

return true;

}
