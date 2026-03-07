const LEDGER_KEY = "albukhr_finance_ledger_v1";

function getLedger(){
  try{
    return JSON.parse(localStorage.getItem(LEDGER_KEY)) || [];
  }catch{
    return [];
  }
}

function saveLedger(data){
  localStorage.setItem(LEDGER_KEY, JSON.stringify(data));
}

function recordTransaction(tx){

  const ledger = getLedger();

  ledger.push({
    id: "TX-" + Date.now(),
    timestamp: Date.now(),
    ...tx
  });

  saveLedger(ledger);

}
