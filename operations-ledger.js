const OPS_KEY = "albukhr_operations_fund";
const OPS_HISTORY = "albukhr_operations_history";

/* ===============================
GET OPERATIONS
=============================== */

function getOperationsBalance(){

return Number(
localStorage.getItem(OPS_KEY)
) || 0;

}

/* ===============================
CREDIT OPERATIONS
=============================== */

function creditOperations(amount){

const gate =
typeof ledgerGate === "function"
? ledgerGate("operations_credit")
: {allowed:true};

if(!gate.allowed){
alert(gate.message);
return;
}

/* VALIDATION */

amount = Number(amount);

if(!amount || amount <= 0){
alert("Invalid amount");
return;
}

/* TOTAL */

let total = getOperationsBalance();

total += amount;

/* SAVE */

localStorage.setItem(
OPS_KEY,
total.toFixed(2)
);

/* HISTORY */

const history =
JSON.parse(
localStorage.getItem(OPS_HISTORY)
) || [];

history.push({

type:"credit",
amount,
total,
timestamp:Date.now(),
admin:
typeof getAdminRole === "function"
? getAdminRole()
: "system"

});

localStorage.setItem(
OPS_HISTORY,
JSON.stringify(history)
);

/* LEDGER */

if(typeof ledgerLog === "function"){

ledgerLog(
"OPERATIONS_CREDIT",
{amount,total}
);

}

/* UNIFIED TX */

if(typeof recordTx === "function"){

recordTx({

type:"operations_credit",
project:"operations",
amount

});

}

}

function debitOperations(amount){

amount = Number(amount);

if(!amount || amount <= 0) return false;

let total = getOperationsBalance();

if(total < amount){
alert("Operations fund insufficient");
return false;
}

total -= amount;

localStorage.setItem(
OPS_KEY,
total.toFixed(2)
);

ledgerLog(
"OPERATIONS_DEBIT",
{amount,total}
);

return true;

}
