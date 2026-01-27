/* ==================================
   ALBUKHR – STAKING DASHBOARD LAYER
   INTERNAL + EXTERNAL (READ ONLY)
   ================================== */

function getDashboardTotals(){
  const internal = typeof getInternalTotals === "function"
    ? getInternalTotals()
    : { totalStake: 0, totalReward: 0 };

  const external = typeof getExternalTotals === "function"
    ? getExternalTotals()
    : { totalStake: 0, totalReward: 0 };

  return {
    totalStake: internal.totalStake + external.totalStake,
    totalReward: internal.totalReward + external.totalReward
  };
}

function getDashboardRecent(limit = 5){
  const internal = typeof getInternalRecent === "function"
    ? getInternalRecent(limit)
    : [];

  const external = typeof getExternalRecent === "function"
    ? getExternalRecent(limit)
    : [];

  return [...internal, ...external]
    .sort((a,b)=> b.timestamp - a.timestamp)
    .slice(0, limit);
}
