// utils.js

function calcReward(amount, rate){
  return amount * rate;
}

function getRate(project, duration){

  const table = {
    Raheem:{30:0.01,60:0.025,90:0.05},
    Hauwal:{30:0.02,60:0.04,90:0.08},
    Khairat:{30:0.025,60:0.05,90:0.09},
    Barsh:{30:0.03,60:0.06,90:0.10},
    Labbaika:{30:0.02,60:0.045,90:0.075},
    Urban:{30:0.12,60:0.12,90:0.12},
    Azman:{30:0.04,60:0.07,90:0.12}
  };

  return table?.[project]?.[duration] || 0;
}

module.exports = { calcReward, getRate };
