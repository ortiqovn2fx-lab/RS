import express from "express";
import serverless from "serverless-http";
import Parser from "rss-parser";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// Инициализация API Gemini из переменной окружения
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.3.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
  }
});

const NEWS_FEEDS = [
  { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
  { id: 'yahoo', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
  { id: 'investing', name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss' },
  { id: 'wsj', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },
  { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' }
];

// Ваш роут для новостей
app.get("/api/market-news", async (req, res) => {
  try {
    const allItems: any[] = [];
    const requestedSources = req.query.sources ? (req.query.sources as string).split(',') : [];
    const feedsToFetch = requestedSources.length > 0 ? NEWS_FEEDS.filter(f => requestedSources.includes(f.id)) : NEWS_FEEDS;

    for (const feed of feedsToFetch) {
      try {
        const result = await parser.parseURL(feed.url);
        const filteredItems = result.items.map(item => {
          const rawContent = (item as any)['content:encoded'] || item.content || item.contentSnippet || "";
          const cleanContent = rawContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          return {
            id: item.guid || item.link,
            title: item.title,
            content: cleanContent,
            date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            author: feed.name,
            url: item.link
          };
        });
        allItems.push(...filteredItems);
      } catch (err) {
        console.error(`Error fetching feed ${feed.name}:`, err);
      }
    }

    const sorted = allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const topItems = sorted.slice(0, 15);

    // AI обогащение (сокращено для краткости)
    const enhancedItems = await Promise.all(topItems.map(async (item) => {
      try {
        const response = await genAI.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: `Create a visual prompt for: "${item.title}"` }] }]
        });
        const aiPrompt = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || item.title;
        return { ...item, imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}` };
      } catch {
        return item;
      }
    }));

    res.json(enhancedItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Экспорт для Netlify
export const handler = serverless(app);