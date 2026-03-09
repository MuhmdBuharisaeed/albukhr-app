/* =========================================
   ALBUKHR AI INVESTMENT ENGINE v1
   Smart investment recommendations
========================================= */

function getInvestmentRecommendations(){

if(typeof getMarketMetrics !== "function")
return null;

const metrics = getMarketMetrics();

if(!metrics.length) return null;


/* BEST OVERALL */

const bestOverall =
metrics
.slice()
.sort((a,b)=>
(b.roi * 0.4 + b.liquidity * 0.3 + b.riskScore * 0.3) -
(a.roi * 0.4 + a.liquidity * 0.3 + a.riskScore * 0.3)
)[0];


/* SAFEST */

const safest =
metrics
.slice()
.sort((a,b)=> b.riskScore - a.riskScore)[0];


/* HIGHEST YIELD */

const highestYield =
metrics
.slice()
.sort((a,b)=> b.roi - a.roi)[0];


/* BALANCED */

const balanced =
metrics
.slice()
.sort((a,b)=>{

const scoreA =
(a.roi*0.3) +
(a.liquidity*0.4) +
(a.riskScore*0.3);

const scoreB =
(b.roi*0.3) +
(b.liquidity*0.4) +
(b.riskScore*0.3);

return scoreB - scoreA;

})[0];


return {

bestOverall,

safest,

highestYield,

balanced

};

}
