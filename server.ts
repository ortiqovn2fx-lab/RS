import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Parser from "rss-parser";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MESSAGES_FILE = path.join(process.cwd(), "messages_history.json");
const POSTS_FILE = path.join(process.cwd(), "posts_history.json");
const COMMENTS_FILE = path.join(process.cwd(), "comments_history.json");

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

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Load existing messages from file
  let messages: any[] = [];
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, "utf-8");
      messages = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading messages:", err);
  }

  // Load existing posts from file
  let sharedPosts: any[] = [];
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, "utf-8");
      sharedPosts = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading shared posts:", err);
  }

  // Load existing comments from file
  let postComments: any[] = [];
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const data = fs.readFileSync(COMMENTS_FILE, "utf-8");
      postComments = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading comments:", err);
  }

  // Track online users: socketId -> nickname
  const onlineUsers = new Map<string, string>();

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Initial sync
    socket.emit("init_messages", messages);
    socket.emit("init_posts", sharedPosts);
    socket.emit("init_comments", postComments);
    
    // Broadcast initial user list
    io.emit("update_online_users", Array.from(new Set(onlineUsers.values())));

    socket.on("join_chat", (nickname: string) => {
      onlineUsers.set(socket.id, nickname);
      // Broadcast updated user list (unique names)
      io.emit("update_online_users", Array.from(new Set(onlineUsers.values())));
    });

    socket.on("send_message", (msg) => {
      const message = {
        ...msg,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
      };
      messages.push(message);
      
      try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
      } catch (err) {
        console.error("Error saving messages:", err);
      }

      io.emit("new_message", message);
    });

    socket.on("create_post", (post) => {
      sharedPosts.unshift(post);
      
      try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(sharedPosts, null, 2));
      } catch (err) {
        console.error("Error saving shared posts:", err);
      }

      io.emit("new_post", post);
    });

    socket.on("add_comment", (commentData) => {
      const comment = {
        ...commentData,
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
      };
      postComments.push(comment);
      
      try {
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(postComments, null, 2));
      } catch (err) {
        console.error("Error saving comments:", err);
      }

      io.emit("new_comment", comment);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      onlineUsers.delete(socket.id);
      io.emit("update_online_users", Array.from(new Set(onlineUsers.values())));
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/market-news", async (req, res) => {
    try {
      const allItems: any[] = [];
      const requestedSources = req.query.sources ? (req.query.sources as string).split(',') : [];
      
      const feedsToFetch = requestedSources.length > 0 
        ? NEWS_FEEDS.filter(f => requestedSources.includes(f.id))
        : NEWS_FEEDS;

      for (const feed of feedsToFetch) {
        try {
          const result = await parser.parseURL(feed.url);
          const filteredItems = result.items.map(item => {
            // Some feeds put full content in 'content:encoded', others in 'content'
            // We want to strip HTML to get a clean "word by word" text copy
            const rawContent = (item as any)['content:encoded'] || item.content || item.contentSnippet || "";
            const cleanContent = rawContent
              .replace(/<[^>]*>/g, ' ') // Strip HTML tags
              .replace(/\s+/g, ' ')     // Normalize whitespace
              .trim();

            return {
              id: item.guid || item.link,
              title: item.title,
              excerpt: item.contentSnippet ? item.contentSnippet.replace(/<[^>]*>/g, '').slice(0, 150) + "..." : cleanContent.slice(0, 150) + "...",
              content: cleanContent,
              category: "News",
              date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
              author: feed.name,
              imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(item.title + " - professional financial photography, cinematic lighting, sleek corporate business aesthetic, high resolution, minimalist style, sharp focus, no text") }?width=1200&height=675&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
              url: item.link
            };
          });
          allItems.push(...filteredItems);
        } catch (err) {
          console.error(`Error fetching feed ${feed.name}:`, err);
        }
      }

      // Sort by date (newest first)
      const sorted = allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Filter for general market terms
      const generalMarketTerms = ['market', 'stock', 'index', 'fed', 'economy', 'inflation', 'gdp', 'rates', 'dow', 'nasdaq', 's&p'];
      const filtered = sorted.filter(item => {
        const text = (item.title + " " + item.excerpt).toLowerCase();
        return generalMarketTerms.some(term => text.includes(term));
      });

      const topItems = filtered.slice(0, 15);

      // ENHANCE IMAGES WITH AI PROMPTS
      const enhancedItems = await Promise.all(topItems.map(async (item) => {
        try {
          const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{
              role: "user",
              parts: [{ text: `Based on this news headline: "${item.title}", create a short, descriptive visual prompt (max 12 words) for an AI image generator. The image should be professional, financial-themed, and cinematic. Avoid text in the output. Focus on realistic office environments, digital charts, or abstract market concepts. Just output the prompt text.` }]
            }]
          });
          
          const aiPrompt = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/["]+/g, '') || item.title;
          
          return {
            ...item,
            imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt + " -- professional financial photography, sleek corporate business aesthetic, high resolution, minimalist style") }?width=1200&height=675&nologo=true&seed=${Math.floor(Math.random() * 100000)}`
          };
        } catch (error) {
          console.error(`AI Image failed for ${item.title}:`, error);
          return item;
        }
      }));

      res.json(enhancedItems);
    } catch (err) {
      console.error("Market news error:", err);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
