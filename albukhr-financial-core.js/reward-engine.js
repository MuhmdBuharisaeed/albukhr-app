function fundReward(project, amount){

  const treasury = getTreasury();

  if(!treasury[project]){
    return {error:"Project treasury missing"};
  }

  if(amount > treasury[project].liquidity){
    return {error:"Not enough liquidity"};
  }

  treasury[project].liquidity -= amount;

  saveTreasury(treasury);

  recordTransaction({
    type:"reward-funded",
    project,
    amount
  });

  return {success:true};

}
