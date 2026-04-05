const COMMUNITY_KEY = "albukhr_community_fund";
const COMMUNITY_HISTORY = "albukhr_community_history";

/* ===============================
CREDIT COMMUNITY
=============================== */

function creditCommunity(amount){

const gate =
typeof ledgerGate === "function"
? ledgerGate("community_credit")
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

/* CURRENT TOTAL */

let total =
Number(localStorage.getItem(COMMUNITY_KEY)) || 0;

total += amount;

/* SAVE TOTAL */

localStorage.setItem(
COMMUNITY_KEY,
total.toFixed(2)
);

/* HISTORY */

const history =
JSON.parse(
localStorage.getItem(COMMUNITY_HISTORY)
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
COMMUNITY_HISTORY,
JSON.stringify(history)
);

/* LEDGER LOG */

if(typeof ledgerLog === "function"){

ledgerLog(
"COMMUNITY_CREDIT",
{amount,total}
);

}

/* UNIFIED TX */

if(typeof recordTx === "function"){

recordTx({

type:"community_credit",
project:"community",
amount:amount

});

}

}
