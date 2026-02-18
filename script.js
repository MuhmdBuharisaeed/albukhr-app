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

function renderPopularProjects(){

  if(typeof getAllStakesMerged !== "function") return;

const stakes = getAllStakesMerged();

let globalMap = {};
let totalStake = 0;
let totalReward = 0;

stakes.forEach(s=>{

  const amount = Number(s.amount)||0;
  const reward = Number(s.remainingReward ?? s.reward)||0;

  totalStake += amount;
  totalReward += reward;

  if(!globalMap[s.project]){
    globalMap[s.project] = {
      total:0,
      investors:0
    };
  }

  globalMap[s.project].total += amount;
  globalMap[s.project].investors += 1;

});

  const sorted = Object.entries(map)
    .sort((a,b)=> b[1] - a[1])
    .slice(0,10);

  const container = document.getElementById("popularProjects");
  container.innerHTML = "";

  sorted.forEach(([project,amount])=>{

    const div = document.createElement("div");
    div.className = "popular-card";

    div.innerHTML = `
      <div class="popular-icon">
        ${getProjectIcon(project)}
      </div>
      <div class="popular-name">
        ${project}
      </div>
      <div class="popular-amount">
        ${amount.toFixed(2)} Pi
      </div>
    `;

    div.onclick = () => scrollToProject(project);

    container.appendChild(div);
  });
}

function scrollToProject(project){

  const el = document.querySelector(
    `[data-project="${project}"]`
  );

  if(el){
    el.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }
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
