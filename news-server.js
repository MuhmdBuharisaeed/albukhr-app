const express = require("express");
const Parser = require("rss-parser");
const app = express();
const parser = new Parser();

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

app.get("/api/news", async (req,res)=>{

  try{

    let allNews = [];

    for(const source of SOURCES){

      const feed = await parser.parseURL(source.url);

      feed.items.slice(0,5).forEach(item=>{
        allNews.push({
          title:item.title,
          link:item.link,
          image:item.enclosure?.url || null,
          date:item.pubDate,
          source:source.name
        });
      });
    }

    allNews.sort((a,b)=> new Date(b.date)-new Date(a.date));

    res.json(allNews.slice(0,10));

  }catch(err){
    res.status(500).json({error:"News fetch failed"});
  }

});

app.listen(3000,()=>console.log("Albukhr News API running"));
