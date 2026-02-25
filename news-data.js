/* ===============================
   ALBUKHR VERIFIED NEWS DATA
   Official Pi Sources Only
================================== */

const DEFAULT_NEWS_IMAGE =
  "https://minepi.com/static/images/blog/default.jpg";

const ALBUKHR_NEWS = [
  {
    id: "ALB-NEWS-001",
    title: "Mainnet Migration Update",
    summary:
      "Pi Core Team shared latest migration statistics and roadmap for ecosystem expansion.",
    source: "Pi Network Blog",
    sourceType: "official",
    date: "2026-02-10",
    link: "https://minepi.com/blog",
    image: "https://minepi.com/static/images/blog/mainnet.jpg",
    video: null,
    verified: true
  },

  {
    id: "ALB-NEWS-002",
    title: "New KYC Phase Announcement",
    summary:
      "Additional KYC slots opened for verified pioneers in preparation for broader Mainnet rollout.",
    source: "Pi App Announcement",
    sourceType: "official",
    date: "2026-01-25",
    link: "https://minepi.com/blog",
    image: "https://minepi.com/static/images/blog/kyc.jpg",
    video: null,
    verified: true
  }
];

/* ===============================
   HELPER: NORMALIZE NEWS ITEM
================================== */

function normalizeNewsItem(item) {
  return {
    id: item.id || "EXT-" + Date.now(),
    title: item.title,
    summary: item.summary || item.description || "",
    source: item.source,
    sourceType: item.sourceType || "external",
    date: item.date,
    link: item.link,
    image: item.image || DEFAULT_NEWS_IMAGE,
    video: item.video || null,
    verified: item.verified || false
  };
}

/* ===============================
   MERGE VERIFIED + API NEWS
================================== */

async function getAllNews() {
  let externalNews = [];

  try {
    const res = await fetch("http://localhost:3000/api/news");
    externalNews = await res.json();
  } catch (e) {
    console.warn("External news unavailable");
  }

  const normalizedExternal = externalNews.map(item =>
    normalizeNewsItem({
      ...item,
      sourceType: "external",
      verified: false
    })
  );

  const normalizedVerified = ALBUKHR_NEWS.map(item =>
    normalizeNewsItem(item)
  );

  const merged = [...normalizedVerified, ...normalizedExternal];

  return merged.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
     }
