/* ==================================
ALBUKHR – STAKING DASHBOARD LAYER
INTERNAL + EXTERNAL (READ ONLY)
================================== */

function getDashboardTotals(){

const internal =
typeof getInternalTotals === "function"
? getInternalTotals()
: { stake:0, reward:0 };

const external =
typeof getExternalTotals === "function"
? getExternalTotals()
: { stake:0, reward:0 };

const totalStake =
Number(internal.stake || internal.totalStake || 0) +
Number(external.stake || external.totalStake || 0);

const totalReward =
Number(internal.reward || internal.totalReward || 0) +
Number(external.reward || external.totalReward || 0);

return {

totalStake:Number(totalStake),
totalReward:Number(totalReward)

};

}


/* ==================================
RECENT
================================== */

function getDashboardRecent(limit = 5){

const internal =
typeof getInternalRecent === "function"
? getInternalRecent(limit)
: [];

const external =
typeof getExternalRecent === "function"
? getExternalRecent(limit)
: [];

const merged =
[...internal,...external]
.filter(t => t)
.sort((a,b)=>
(Number(b.timestamp||0)) -
(Number(a.timestamp||0))
);

return merged.slice(0, limit);

}

function getDashboardStats(){

const totals = getDashboardTotals();

return {

totalStake:
totals.totalStake.toFixed(2),

totalReward:
totals.totalReward.toFixed(2)

};

  }

const stats =
getDashboardStats();

stakeUI.innerText =
stats.totalStake + " Pi";

rewardUI.innerText =
stats.totalReward + " Pi";
