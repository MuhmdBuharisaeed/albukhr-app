const express = require("express");
const Parser = require("rss-parser");
const cors = require("cors");

const app = express();
const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"]
    ]
  }
});

app.use(cors());

const SOURCES = [
  {
    name: "Pi Network",
    url: "https://minepi.com/blog/rss"
  },
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/"
  }
];

function extractImage(item) {
  // 1️⃣ enclosure
  if (item.enclosure?.url) return item.enclosure.url;

  // 2️⃣ media:content
  if (item.mediaContent?.url) return item.mediaContent.url;

  // 3️⃣ media:thumbnail
  if (item.mediaThumbnail?.url) return item.mediaThumbnail.url;

  // 4️⃣ extract img from content HTML
  if (item.content) {
    const match = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }

  return null;
}

function extractVideo(item) {
  if (item.enclosure?.type?.includes("video")) {
    return item.enclosure.url;
  }

  if (item.mediaContent?.type?.includes("video")) {
    return item.mediaContent.url;
  }

  return null;
}

app.get("/api/news", async (req, res) => {
  try {
    let allNews = [];

    for (const source of SOURCES) {
      const feed = await parser.parseURL(source.url);

      feed.items.slice(0, 6).forEach(item => {
        allNews.push({
          title: item.title,
          link: item.link,
          image: extractImage(item),
          video: extractVideo(item),
          description: item.contentSnippet || "",
          date: item.pubDate,
          source: source.name
        });
      });
    }

    // Sort latest first
    allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(allNews.slice(0, 12));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "News fetch failed" });
  }
});

app.listen(3000, () =>
  console.log("Albukhr News API running on port 3000")
);
