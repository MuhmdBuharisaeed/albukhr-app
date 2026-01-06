// ========== A CIRE ANIMATION NA HEADER ==========
document.addEventListener('DOMContentLoaded', function () {

  // Kashe duk motsin da ya shafi brand/header
  const brand = document.querySelector('.brand');
  const tagline = document.querySelector('.tagline');

  if (brand) brand.style.transform = 'none';
  if (tagline) tagline.style.transform = 'none';

});


// ========== SHOW / HIDE RAHEEM PHARMACY DETAILS ==========

function openRaheem() {
  const list = document.getElementById("projectsList");
  const details = document.getElementById("raheemDetails");

  if (list && details) {
    list.style.display = "none";
    details.style.display = "block";
  }
}

function closeRaheem() {
  const list = document.getElementById("projectsList");
  const details = document.getElementById("raheemDetails");

  if (list && details) {
    details.style.display = "none";
    list.style.display = "block";
  }
}


// ========== ANDROID BACK SUPPORT ==========

window.addEventListener('popstate', function () {

  const details = document.getElementById("raheemDetails");
  const list = document.getElementById("projectsList");

  // idan user ya danna back a wayar Android
  if (details && details.style.display === 'block') {
    closeRaheem();
  } else {
    history.back(); // normal back
  }

});


// ========== LOKACI DA USER YA SHIGA DETAILS A TURASU A HISTORY ==========

function enterRaheemDetails() {
  history.pushState({ page: "raheem" }, "Raheem Pharmacy", "#raheem");
}
