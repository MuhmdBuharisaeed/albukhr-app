/* =====================================
   INTERNAL PROFIT SHARING RULES
===================================== */

const PROFIT_RULES_KEY = "albukhr_profit_rules";

const defaultProfitRules = {
  investors: 50,
  reserve: 20,
  treasury: 15,
  operations: 10,
  community: 5
};

function getProfitRules(){
  return JSON.parse(
    localStorage.getItem(PROFIT_RULES_KEY)
  ) || defaultProfitRules;
}

function validateProfitRules(rules){
  const total = Object.values(rules)
    .reduce((a,b)=>a+b,0);

  if(total !== 100) return false;
  if(rules.investors < 40) return false;

  return true;
}

function saveProfitRules(rules){
  if(!validateProfitRules(rules)){
    alert("Invalid profit-sharing rules.");
    return false;
  }
  localStorage.setItem(
    PROFIT_RULES_KEY,
    JSON.stringify(rules)
  );
  return true;
}
