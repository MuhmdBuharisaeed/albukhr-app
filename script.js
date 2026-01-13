<script>
  const projectsList = document.getElementById("projectsList");
  const raheemDetails = document.getElementById("raheemDetails");

  function openRaheem() {
    projectsList.style.display = "none";
    raheemDetails.style.display = "block";

    // saka state a history
    history.pushState({ page: "raheem" }, "", "#raheem");
  }

  function closeRaheem() {
    raheemDetails.style.display = "none";
    projectsList.style.display = "block";

    // koma baya a history
    history.pushState({ page: "projects" }, "", "#projects");
  }

  // 🧠 KAMA BACK NA BROWSER
  window.onpopstate = function (event) {
    if (event.state && event.state.page === "raheem") {
      projectsList.style.display = "none";
      raheemDetails.style.display = "block";
    } else {
      raheemDetails.style.display = "none";
      projectsList.style.display = "block";
    }
  };
</script>

// GLOBAL STAKING DATA (placeholder)
let stakingAmount = 0.00;
let rewardAmount = 0.00;

// Nuna a UI
document.getElementById("totalStaking").innerText = stakingAmount.toFixed(2) + " Pi";
document.getElementById("totalRewards").innerText = rewardAmount.toFixed(2) + " Pi";
