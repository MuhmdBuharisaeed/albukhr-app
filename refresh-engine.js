<script>
/* ======================================
   ALBUKHR – SMART AUTO REFRESH v2
   Interval: 2 Minutes
====================================== */

(function(){

  const REFRESH_INTERVAL = 120000; // 2 minutes
  let refreshTimer = null;

  function smartRefresh(){

    /* Wallet Page */
    if(typeof renderWallet === "function"){
      renderWallet();
      return;
    }

    /* Transactions Page */
    if(typeof loadTransactions === "function"){
      loadTransactions();
      return;
    }

    /* Home Page */
    if(typeof loadHome === "function"){
      loadHome();
      return;
    }

    /* Fallback */
    location.reload();
  }

  /* Start interval */
  if(!refreshTimer){
    refreshTimer = setInterval(smartRefresh, REFRESH_INTERVAL);
  }

  /* Refresh when user returns to tab */
  document.addEventListener("visibilitychange", ()=>{
    if(!document.hidden){
      smartRefresh();
    }
  });

})();
</script>
