/* ===============================
   ALBUKHR REWARD ENGINE v2
   Dashboard-based rewards
================================ */

const STAKE_KEY = "albukhr_stakes";

/* RECORD REWARD INTO STAKE */
function giveReward(projectId, amount){

amount = Number(amount);

if(!projectId || amount <= 0) return false;

const stakes =
JSON.parse(localStorage.getItem(STAKE_KEY)) || [];

stakes.forEach(stake => {

if(stake.project === projectId){

stake.remainingReward =
(stake.remainingReward || 0) + amount;

}

});

localStorage.setItem(
STAKE_KEY,
JSON.stringify(stakes)
);

return true;

}

/* SYNC PROJECT REWARDS */

function syncProjectRewards(projects){

projects.forEach(p => {

if(p.rewards && p.rewards > 0){

giveReward(p.projectId, p.rewards);

}

});

}

/* GET PROJECT REWARD TOTAL */

function getProjectReward(projectId){

const stakes =
JSON.parse(localStorage.getItem(STAKE_KEY)) || [];

return stakes
.filter(s => s.project === projectId)
.reduce((sum,s)=> sum + (s.remainingReward||0),0);

   }
