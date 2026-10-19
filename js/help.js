(function () {
  "use strict";

  const searchInput = document.getElementById("helpSearch");
  const searchStatus = document.getElementById("helpSearchStatus");

  const alertElement = document.getElementById("appAlert");
  const alertTitle = document.getElementById("appAlertTitle");
  const alertText = document.getElementById("appAlertText");
  const alertClose = document.getElementById("appAlertClose");

  let lastFocusedElement = null;

  function openAppAlert(title, message) {
    if (!alertElement || !alertTitle || !alertText) {
      window.alert(title + "\n\n" + message);
      return;
    }

    lastFocusedElement = document.activeElement;

    alertTitle.textContent = title;
    alertText.textContent = message;

    alertElement.hidden = false;
    alertElement.style.display = "flex";

    if (alertClose) {
      alertClose.focus();
    }
  }

  function closeAppAlert() {
    if (!alertElement) {
      return;
    }

    alertElement.hidden = true;
    alertElement.style.display = "none";

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === "function"
    ) {
      lastFocusedElement.focus();
    }
  }

  window.openAppAlert = openAppAlert;
  window.closeAppAlert = closeAppAlert;

  window.comingSoon = function (feature) {
    const featureName = String(feature || "This feature");

    if (/pi payments/i.test(featureName)) {
      openAppAlert(
        "Payment Availability",
        "Do not initiate a Pi payment unless the official ALBUKHR interface explicitly shows that the payment channel is enabled. This help option does not activate payments."
      );
      return;
    }

    openAppAlert(
      "Not Yet Available",
      featureName +
        " is not connected to a live support workflow on this page yet. For assistance, contact albukhrinvestmentlimited@gmail.com."
    );
  };

  if (alertClose) {
    alertClose.addEventListener("click", closeAppAlert);
  }

  if (alertElement) {
    alertElement.addEventListener("click", function (event) {
      if (event.target === alertElement) {
        closeAppAlert();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      alertElement &&
      !alertElement.hidden
    ) {
      closeAppAlert();
    }
  });

  /* FAQ expand/collapse */
  document.querySelectorAll(".faq-item").forEach(function (item, index) {
    const button = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    if (!button || !answer) {
      return;
    }

    if (!answer.id) {
      answer.id = "help-faq-answer-" + (index + 1);
    }

    button.type = "button";
    button.setAttribute("aria-controls", answer.id);
    button.setAttribute("aria-expanded", "false");
    answer.hidden = true;

    button.addEventListener("click", function () {
      const willOpen = button.getAttribute("aria-expanded") !== "true";

      button.setAttribute("aria-expanded", String(willOpen));
      answer.hidden = !willOpen;
      item.classList.toggle("active", willOpen);
    });
  });

  /* Search the visible help content. */
  function applySearch() {
    const query = String(searchInput ? searchInput.value : "")
      .trim()
      .toLocaleLowerCase();

    const cards = Array.from(
      document.querySelectorAll(".help-page .help-card")
    );

    let visibleCards = 0;

    cards.forEach(function (card) {
      const title = card.querySelector(".section-title");
      const titleMatches =
        Boolean(query) &&
        title &&
        title.textContent.toLocaleLowerCase().includes(query);

      const repeatedSelectors = [
        ".faq-item",
        ".quick-help-btn",
        ".help-item",
        ".tip-item"
      ];

      let hasRepeatedItems = false;
      let visibleItems = 0;

      repeatedSelectors.forEach(function (selector) {
        const items = Array.from(card.querySelectorAll(selector));

        if (items.length === 0) {
          return;
        }

        hasRepeatedItems = true;

        items.forEach(function (item) {
          const match =
            !query ||
            titleMatches ||
            item.textContent.toLocaleLowerCase().includes(query);

          item.hidden = !match;

          if (match) {
            visibleItems += 1;
          }
        });
      });

      let cardMatches;

      if (!query || titleMatches) {
        cardMatches = true;
      } else if (hasRepeatedItems) {
        cardMatches = visibleItems > 0;
      } else {
        cardMatches = card.textContent.toLocaleLowerCase().includes(query);
      }

      card.hidden = !cardMatches;

      if (cardMatches) {
        visibleCards += 1;
      }
    });

    if (searchStatus) {
      if (query && visibleCards === 0) {
        searchStatus.textContent =
          "No matching help topics were found. Try a different search or email albukhrinvestmentlimited@gmail.com.";
        searchStatus.hidden = false;
      } else if (query) {
        searchStatus.textContent =
          visibleCards + " help section(s) matched your search.";
        searchStatus.hidden = false;
      } else {
        searchStatus.textContent = "";
        searchStatus.hidden = true;
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", applySearch);
  }

  /* Return the page to its unfiltered state when the query is cleared. */
  window.resetHelpSearch = function () {
    if (searchInput) {
      searchInput.value = "";
    }

    applySearch();
  };

  /* Start with the full help center visible. */
  applySearch();
})();
