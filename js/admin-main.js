document.addEventListener(
"DOMContentLoaded",
async()=>{

const admin =
await getCurrentAdminSession();

if(!admin){

window.location.href =
"admin-login.html";

return;

}

/* Only Super Admin & Finance Admin */

await requireAdminRole([
"super_admin",
"finance_admin"
]);

/* INITIAL LOAD */

await renderTreasuryOverview();

await loadRecentTransactions();

await checkLiquidity();

await loadAnalytics();

await renderPendingRequests();

await renderApprovedRequests();

await renderPaidRequests();

/* AUTO REFRESH */

setInterval(async()=>{

await renderTreasuryOverview();

await loadRecentTransactions();

await checkLiquidity();

await loadAnalytics();

await renderPendingRequests();

await renderApprovedRequests();

await renderPaidRequests();

},60000);

}
);
