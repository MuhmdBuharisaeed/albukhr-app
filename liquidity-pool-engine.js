/* =========================================
   ALBUKHR LIQUIDITY POOL ENGINE v1
========================================= */

const POOL_KEY = "albukhr_liquidity_pools_v1";

/* STORAGE */

function getPools(){
try{
return JSON.parse(localStorage.getItem(POOL_KEY)) || {};
}catch{
return {};
}
}

function savePools(data){
localStorage.setItem(POOL_KEY, JSON.stringify(data));
}

/* CREATE POOL */

function createLiquidityPool(project){

const pools = getPools();

if(!pools[project]){

pools[project] = {
project: project,
liquidity: 0,
contributors: [],
created: Date.now()
};

savePools(pools);
}

}

/* ADD LIQUIDITY */

function addPoolLiquidity(project, amount, contributor="system"){

amount = Number(amount);

if(!amount || amount <= 0){
return {error:"Invalid liquidity amount"};
}

const pools = getPools();

if(!pools[project]){
createLiquidityPool(project);
}

pools[project].liquidity += amount;

pools[project].contributors.push({
address: contributor,
amount: amount,
timestamp: Date.now()
});

savePools(pools);

return {
success:true,
liquidity: pools[project].liquidity
};

}

/* GET POOL STATUS */

function getPoolStatus(project){

const pools = getPools();

if(!pools[project]){
return {
liquidity:0,
contributors:0
};
}

return {
liquidity: pools[project].liquidity,
contributors: pools[project].contributors.length
};

}

/* USE LIQUIDITY */

function usePoolLiquidity(project, amount){

amount = Number(amount);

const pools = getPools();

if(!pools[project]){
return {error:"Pool not found"};
}

if(pools[project].liquidity < amount){
return {error:"Insufficient liquidity"};
}

pools[project].liquidity -= amount;

savePools(pools);

return {
success:true,
remaining: pools[project].liquidity
};

}
