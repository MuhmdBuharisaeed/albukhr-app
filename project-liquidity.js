/* =================================
ALBUKHR PROJECT LIQUIDITY ENGINE
================================ */

function getProjectLiquidity(project){

const txs = getTransactions() || [];

let liquidity = 0;
let withdrawn = 0;

txs.forEach(tx=>{

if(tx.project === project){

if(tx.type === "project-liquidity"){
liquidity += Number(tx.amount)||0;
}

if(tx.type === "withdraw"){
withdrawn += Number(tx.amount)||0;
}

}

});

const reserve = liquidity * 0.30;

const withdrawable = liquidity - reserve - withdrawn;

return {

liquidity,
reserve,
withdrawable

};

}

/* ========================= */

function canProjectWithdraw(project, amount){

const data =
getProjectLiquidity(project);

return amount <= data.withdrawable;

}

/* ========================= */

function guardProjectWithdraw(project, amount){

if(!canProjectWithdraw(project, amount)){

const data =
getProjectLiquidity(project);

alert(

"Project liquidity protection active\n\n" +

"Available: " +
data.withdrawable.toFixed(2) +
" Pi"

);

return false;

}

return true;

}
