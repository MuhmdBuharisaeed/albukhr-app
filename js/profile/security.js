(function () {
  "use strict";

  const securityList = document.getElementById("securityList");

  if (!securityList) {
    console.error(
      "ALBUKHR Security: #securityList element was not found."
    );
    return;
  }

  const securityItems = [
    {
      icon: "🔐",
      title: "Account and Authentication",
      description:
        "Use the official ALBUKHR sign-in flow. Keep your account access secure and never share passwords or authentication secrets.",
      status: "Security guidance"
    },
    {
      icon: "👛",
      title: "Wallet Protection",
      description:
        "Never share your Pi Wallet passphrase or private keys with anyone claiming to represent ALBUKHR. ALBUKHR support should not ask you to disclose these secrets.",
      status: "Keep credentials private"
    },
    {
      icon: "🌐",
      title: "Mainnet and Testnet",
      description:
        "Always confirm which network is selected before using a network-dependent feature. Mainnet and Testnet data must remain isolated.",
      status: "Check network"
    },
    {
      icon: "🛡️",
      title: "Suspicious Activity",
      description:
        "If you notice unfamiliar account activity or suspect unauthorised access, stop using the affected feature and contact ALBUKHR through its official contact channel.",
      status: "Report concerns"
    },
    {
      icon: "📄",
      title: "Privacy and Personal Data",
      description:
        "Review the Privacy Policy to understand how personal information may be handled and how to submit a privacy-related request.",
      status: "Review policy",
      href: "privacy-policy.html"
    },
    {
      icon: "✉️",
      title: "Contact ALBUKHR",
      description:
        "For questions about account security, report the issue without sending passwords, private keys or wallet recovery phrases.",
      status: "Official contact",
      href: "mailto:albukhrinvestmentlimited@gmail.com?subject=ALBUKHR%20Security%20Concern"
    }
  ];

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (typeof text === "string") {
      element.textContent = text;
    }

    return element;
  }

  function createSecurityCard(item) {
    const card = createElement("section", "security-card");
    const left = createElement("div", "security-left");
    const icon = createElement("div", "security-icon", item.icon);
    const info = createElement("div", "security-info");
    const title = createElement("h3", "", item.title);
    const description = createElement("p", "", item.description);
    const status = createElement("p", "security-status", item.status);

    icon.setAttribute("aria-hidden", "true");

    info.appendChild(title);
    info.appendChild(description);
    info.appendChild(status);

    left.appendChild(icon);
    left.appendChild(info);
    card.appendChild(left);

    if (item.href) {
      const link = createElement("a", "security-link", "Open");

      link.href = item.href;
      link.setAttribute("aria-label", item.title);

      if (item.href.startsWith("mailto:")) {
        link.setAttribute("rel", "nofollow");
      }

      card.appendChild(link);
    }

    return card;
  }

  function renderSecurityPage() {
    const fragment = document.createDocumentFragment();

    const notice = createElement(
      "div",
      "security-notice",
      "This page currently provides security guidance. It does not change account, authentication, wallet or transaction settings."
    );

    notice.setAttribute("role", "note");

    fragment.appendChild(notice);

    securityItems.forEach(function (item) {
      fragment.appendChild(createSecurityCard(item));
    });

    securityList.replaceChildren(fragment);
  }

  renderSecurityPage();
})();
