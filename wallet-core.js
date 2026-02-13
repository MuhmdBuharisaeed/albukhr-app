/* =========================================
   ALBUKHR WALLET CORE v4 (CLEAN)
   Single Source of Truth
========================================= */

const WITHDRAW_KEY = "albukhr_withdrawals";

/* ===============================
   STORAGE HELPERS
=================================*/

function getWithdrawals() {
  return JSON.parse(localStorage.getItem(WITHDRAW_KEY)) || [];
}

function saveWithdrawals(data) {
  localStorage.setItem(WITHDRAW_KEY, JSON.stringify(data));
}

/* ===============================
   WALLET SUMMARY
=================================*/

function getWalletSummary() {

  // total staked daga staking system
  const stakes = getExternalStakes ? getExternalStakes() : [];
  const totalStake = stakes.reduce((sum, s) => sum + Number(s.amount), 0);

  // total rewards daga staking calculator
  const totalReward = typeof calculateRewards === "function"
    ? calculateRewards()
    : 0;

  // total withdrawn
  const withdrawals = getWithdrawals();
  const withdrawn = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  // available balance
  const available = totalReward;

  return {
    totalStake,
    totalReward,
    withdrawn,
    available
  };
}

/* ===============================
   REQUEST WITHDRAW
=================================*/

function requestWithdraw(amount, walletAddress) {

  const amt = Number(amount);

  if (!amt || amt <= 0) {
    return { error: "Invalid amount" };
  }

  if (!walletAddress || walletAddress.length < 10) {
    return { error: "Invalid wallet address" };
  }

  const summary = getWalletSummary();

  if (amt > summary.available) {
    return { error: "Insufficient reward balance" };
  }

  // Rage rewards kai tsaye daga staking system
  if (typeof reduceRewards === "function") {
    reduceRewards(amt);
  }

  // Ajiye withdrawal
  const withdrawals = getWithdrawals();

  withdrawals.push({
    id: "wd_" + Date.now(),
    type: "withdraw",
    amount: amt,
    walletAddress,
    timestamp: Date.now()
  });

  saveWithdrawals(withdrawals);

  return { success: true };
}

/* ===============================
   MERGED HISTORY (INDEX USE)
=================================*/

function getMergedHistory() {

  const stakingTx = getExternalStakes
    ? getExternalStakes().map(s => ({
        id: s.id,
        type: "stake",
        amount: s.amount,
        createdAt: s.createdAt
      }))
    : [];

  const withdrawTx = getWithdrawals().map(w => ({
    id: w.id,
    type: "withdraw",
    amount: w.amount,
    walletAddress: w.walletAddress,
    createdAt: w.timestamp
  }));

  return [...stakingTx, ...withdrawTx]
    .sort((a, b) => b.createdAt - a.createdAt);
}
