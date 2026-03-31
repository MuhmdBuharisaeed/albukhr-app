/* =========================================
   ALBUKHR STAKING VERIFICATION ENGINE v1
   Real Pi Stake Validation System
========================================= */

const REAL_STAKE_KEY = "albukhr_real_pi_stakes";

/* =========================================
   SAFE STORAGE
========================================= */

function getRealPiStakes(){

try{
return JSON.parse(
localStorage.getItem(REAL_STAKE_KEY)
) || [];
}catch{
return [];
}

}

function saveRealPiStakes(data){

localStorage.setItem(
REAL_STAKE_KEY,
JSON.stringify(data)
);

}

/* =========================================
   MINIMUM RULES
========================================= */

const MIN_STAKE = 100;       // 100 Pi minimum
const MIN_DURATION = 1095;   // 3 years (days)

/* =========================================
   RECORD REAL PI STAKE
========================================= */

function recordRealPiStake({

project,
owner,
wallet,
amount,
duration,
txid

}){

amount = Number(amount);
duration = Number(duration);

if(!project || !owner || !wallet){
return {error:"Invalid stake data"};
}

if(amount < MIN_STAKE){
return {
error:"Minimum stake is 100 Pi"
};
}

if(duration < MIN_DURATION){
return {
error:"Minimum lock duration is 3 years"
};
}

const stakes = getRealPiStakes();

stakes.push({

id: "REAL-"+Date.now(),

project,
owner,
wallet,

amount,
duration,

txid: txid || null,

verified: true,
timestamp: Date.now()

});

saveRealPiStakes(stakes);

return {
success:true
};

}

/* =========================================
   VERIFY PROJECT STAKE
========================================= */

function verifyProjectStake(project, owner){

const stakes = getRealPiStakes();

const found = stakes.find(s =>

s.project === project &&
s.owner === owner &&
s.amount >= MIN_STAKE &&
s.duration >= MIN_DURATION &&
s.verified === true

);

if(found){
return {
verified:true,
stake:found
};
}

return {
verified:false
};

}

/* =========================================
   GET PROJECT STAKE
========================================= */

function getProjectStake(project){

const stakes = getRealPiStakes();

return stakes.find(s =>
s.project === project
);

}

/* =========================================
   CHECK BEFORE PROJECT DEPLOY
========================================= */

function requireStakeBeforeDeploy(project, owner){

const check =
verifyProjectStake(project, owner);

if(!check.verified){

return {
allowed:false,
error:"Project requires 100 Pi staking for 3 years"
};

}

return {
allowed:true
};

}

/* =========================================
   PROJECT STAKE STATUS
========================================= */

function getProjectStakeStatus(project){

const stake =
getProjectStake(project);

if(!stake){

return {
staked:false,
amount:0,
duration:0
};

}

return {

staked:true,
amount:stake.amount,
duration:stake.duration,
wallet:stake.wallet

};

}
