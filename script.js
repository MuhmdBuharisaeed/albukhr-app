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

function openStake() {
  document.getElementById("stakeModal").style.display = "flex";
}

function closeStake() {
  document.getElementById("stakeModal").style.display = "none";
}

function confirmStake() {
  const amount = document.getElementById("stakeAmount").value;
  const duration = document.getElementById("stakeDuration").value;

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  alert(
    "Stake confirmed!\nAmount: " +
      amount +
      " Pi\nDuration: " +
      duration +
      " days"
  );

  closeStake();
}

<script>
(function () {
  const currentPage = document.body.getAttribute("data-page");
  if (!currentPage) return;

  document.querySelectorAll(".bottom-nav a").forEach(link => {
    if (link.dataset.nav === currentPage) {
      link.classList.add("active");
    }
  });
})();
</script>

[
  {
    project: "Raheem",
    amount: 20,
    reward: 0.2,
    duration: 30,
    date: "2026-01-16T14:20:00Z"
  }
]
