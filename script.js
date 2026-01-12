/* ========== ALBUKHR ROUTING SYSTEM ========== */

function goProject(page) {
  /* shiga folder projects */
  window.location.href = "projects/" + page;
}

/* Back na waya ya koma index idan muna project page */
function smartBackHome() {
  window.location.href = "../index.html";
}

/* Handle browser back button */
window.onpopstate = function () {
  const path = window.location.pathname;

  if (path.includes("/projects/")) {
    /* duk project page idan an yi back ya koma dashboard */
    window.location.href = "../index.html";
  }
};

/* Generic init – kashe animation na watermark */
document.addEventListener("DOMContentLoaded", () => {
  const brand = document.querySelector('.brand');
  if (brand) {
    brand.style.animation = 'none';
  }
});
