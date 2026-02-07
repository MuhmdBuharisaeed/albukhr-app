const TX_KEY = "albukhr_transactions";

/* LOAD */
function getTransactions(){
  return JSON.parse(localStorage.getItem(TX_KEY)) || [];
}

/* SAVE */
function saveTransactions(list){
  localStorage.setItem(TX_KEY, JSON.stringify(list));
}

/* ADD TRANSACTION (system use) */
function addTransaction(data){
  const list = getTransactions();
  list.push({
    id: "TX-" + Date.now(),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...data
  });
  saveTransactions(list);
}

/* UPDATE STATUS */
function updateTransactionStatus(id,status){
  const list = getTransactions();
  const tx = list.find(t=>t.id===id);
  if(tx){
    tx.status = status;
    tx.updatedAt = new Date().toISOString();
  }
  saveTransactions(list);
}
