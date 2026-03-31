/* =========================================
   ALBUKHR PROJECT STAKE UI ENGINE v1
========================================= */

function renderProjectStakeUI(project, owner){

const container =
document.getElementById("projectStakeBox");

if(!container) return;

const status =
typeof getProjectStakeStatus === "function"
? getProjectStakeStatus(project)
: {staked:false};

if(!status.staked){

container.innerHTML = `

<div class="stake-box">

<h4>🔒 Project Staking Required</h4>

<p>
This project requires minimum
<b>100 Pi staking for 3 years</b>
before deployment.
</p>

<input
id="stakeWallet"
placeholder="Pi Wallet Address"
>

<input
id="stakeAmount"
type="number"
placeholder="Stake Amount (Min 100 Pi)"
value="100"
>

<select id="stakeDuration">

<option value="1095">
3 Years (Required)
</option>

</select>

<button onclick="submitProjectStake('${project}','${owner}')">

Stake & Activate Project

</button>

</div>

`;

return;
}

/* IF STAKED */

container.innerHTML = `

<div class="stake-box verified">

<h4>✅ Stake Verified</h4>

<div class="row">
<div>Amount</div>
<div>${status.amount} Pi</div>
</div>

<div class="row">
<div>Duration</div>
<div>${status.duration} Days</div>
</div>

<div class="row">
<div>Wallet</div>
<div>${status.wallet}</div>
</div>

</div>

`;

}

/* =========================================
   SUBMIT STAKE
========================================= */

function submitProjectStake(project, owner){

const wallet =
document.getElementById("stakeWallet").value;

const amount =
document.getElementById("stakeAmount").value;

const duration =
document.getElementById("stakeDuration").value;

if(!wallet || !amount){

alert("Please complete staking details");
return;

}

const res =
recordRealPiStake({

project,
owner,
wallet,
amount,
duration

});

if(res?.error){

alert(res.error);
return;

}

alert("Stake recorded successfully");

renderProjectStakeUI(project, owner);

}
