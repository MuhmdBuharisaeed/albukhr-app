/* =====================================
   INTERNAL PROFIT ENGINE
===================================== */

function distributeProjectProfit(projectId, totalProfit){

  const gate = adminCanProceed("profit_distribution");
  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  if(totalProfit <= 0){
    alert("Invalid profit amount.");
    return;
  }

  const rules = getProfitRules();

  const payouts = {
    investors: totalProfit * rules.investors / 100,
    reserve: totalProfit * rules.reserve / 100,
    treasury: totalProfit * rules.treasury / 100,
    operations: totalProfit * rules.operations / 100,
    community: totalProfit * rules.community / 100
  };

  // Investors → wallet
  walletReceive(payouts.investors, "internal_profit");

  // Treasury (system ledger only)
  systemTreasuryCredit(payouts.treasury);

  // Reserve
  projectReserveCredit(projectId, payouts.reserve);

  // Operations
  operationsFundCredit(payouts.operations);

  // Community
  communityFundCredit(payouts.community);

  logProfitDistribution(projectId, totalProfit, payouts);

  alert("Profit distributed successfully.");
}

walletReceive(payouts.investors,"internal_profit");

creditTreasury(payouts.treasury);
creditProjectReserve(projectId,payouts.reserve);
creditOperations(payouts.operations);
creditCommunity(payouts.community);
