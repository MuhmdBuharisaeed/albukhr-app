document.addEventListener(
"DOMContentLoaded",
async()=>{

try{

const admin =
await getCurrentAdminSession();

if(!admin){

window.location.href =
"admin-login.html";

return;

}

await requireAdminRole([
"super_admin",
"finance_admin"
]);

await renderTreasuryOverview();

await loadRecentTransactions();

await checkLiquidity();

await loadAnalytics();

await renderPendingRequests();

await renderApprovedRequests();

await renderPaidRequests();

setInterval(async()=>{

try{

await renderTreasuryOverview();

await loadRecentTransactions();

await checkLiquidity();

await loadAnalytics();

await renderPendingRequests();

await renderApprovedRequests();

await renderPaidRequests();

}catch(error){

console.error(
"Auto Refresh Error:",
error
);

}

},60000);

}catch(error){

console.error(
"Admin Wallet Init Error:",
error
);

window.location.href =
"admin-login.html";

}

});
