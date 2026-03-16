/* =========================================
   ALBUKHR MASTER STAKING ENGINE v4
   Unified Staking + Reward + Withdraw
========================================= */

const STAKE_KEY = "albukhr_stakes";

/* =========================================
   SAFE STORAGE
========================================= */

function loadStakes(){

try{
return JSON.parse(localStorage.getItem(STAKE_KEY)) || [];
}catch{
return [];
}

}

function saveStakes(data){

localStorage.setItem(
STAKE_KEY,
JSON.stringify(data)
);

}

/* =========================================
   CREATE STAKE
========================================= */

function createStake({project, amount, duration}){

amount = Number(amount);
duration = Number(duration);

if(!project || !amount || amount <= 0){
return {error:"Invalid stake"};
}

const rate = getRate(project,duration);

const reward = amount * rate;

const stakes = loadStakes();

const stake = {

id:"ST-"+Date.now(),
project,
amount,
duration,

reward,
remainingReward:reward,

capitalWithdrawn:false,

timestamp:Date.now(),
status:"active"

};

stakes.push(stake);

saveStakes(stakes);

return {
success:true,
stake
};

}

/* =========================================
   GET USER STAKES
========================================= */

function getUserStakes(project){

return loadStakes()
.filter(s => s.project === project);

}

/* =========================================
   CALCULATE TOTAL REWARDS
========================================= */

function getTotalReward(project){

const stakes = getUserStakes(project);

let total = 0;

stakes.forEach(s=>{
total += Number(s.remainingReward) || 0;
});

return total;

}

/* =========================================
   WITHDRAW REWARD
========================================= */

function withdrawReward(stakeId){

const stakes = loadStakes();

const stake = stakes.find(s => s.id === stakeId);

if(!stake){
return {error:"Stake not found"};
}

if(stake.remainingReward <= 0){
return {error:"No reward available"};
}

const amount = stake.remainingReward;

stake.remainingReward = 0;

saveStakes(stakes);

/* record wallet transaction */

if(typeof recordTransaction === "function"){

recordTransaction({

type:"reward-withdraw",
project:stake.project,
amount

});

}

return {

success:true,
amount

};

}

/* =========================================
   WITHDRAW CAPITAL
========================================= */

function withdrawCapital(stakeId){

const stakes = loadStakes();

const stake = stakes.find(s => s.id === stakeId);

if(!stake){
return {error:"Stake not found"};
}

if(stake.capitalWithdrawn){
return {error:"Capital already withdrawn"};
}

stake.capitalWithdrawn = true;

saveStakes(stakes);

/* record wallet */

if(typeof recordTransaction === "function"){

recordTransaction({

type:"capital-withdraw",
project:stake.project,
amount:stake.amount

});

}

return {

success:true,
amount:stake.amount

};

}

/* =========================================
   PROJECT TOTALS
========================================= */

function getProjectTotals(project){

const stakes = getUserStakes(project);

let capital = 0;
let reward  = 0;

stakes.forEach(s => {

capital += Number(s.amount) || 0;
reward  += Number(s.remainingReward) || 0;

});

return {

capital,
reward,
investors:stakes.length

};

  }
