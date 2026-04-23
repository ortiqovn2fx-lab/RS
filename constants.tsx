
import { Category, Post } from './types';

export const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    title: 'The Principles of Value Investing',
    excerpt: 'Exploring Benjamin Graham\'s core tenets and how they apply to the 2024 market climate.',
    content: 'Value investing is the strategy of selecting stocks that trade for less than their intrinsic values. In this deep dive, we explore margin of safety, the concept of Mr. Market, and why emotional discipline is the key to outperforming the indices over a 10-year horizon. We also examine how modern automated screening tools have changed the hunt for undervalued assets.',
    category: Category.ARTICLES,
    date: '2024-03-24T13:15:00Z',
    author: 'RS',
    imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
    readingTime: '10 min read',
    documentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'market-1',
    title: 'Q2 Tech Outlook',
    excerpt: 'Deep dive into semiconductor demand and cloud infrastructure spending for the upcoming quarter.',
    content: 'As we enter the second quarter, the focus remains heavily on the AI infrastructure build-out. Hyperscalers continue to allocate significant capital to GPU clusters. We analyze the supply chain implications and potential bottlenecks in advanced packaging.',
    category: Category.MARKET_VIEW,
    date: '2024-03-26T15:30:00Z',
    author: 'RS',
    imageUrl: 'https://images.unsplash.com/photo-1611974717482-4800b3f24242?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'news-1',
    title: 'Index Analysis: Resistance Levels',
    excerpt: 'Technical analysis of major indices as they approach multi-year resistance levels.',
    content: 'The S&P 500 closed at a record high today as investors reacted positively to strong earnings from key semiconductor players and cooling inflation data. Analysts are watching the upcoming Federal Reserve meeting closely for signals on rate cuts.',
    category: Category.MARKET_VIEW,
    date: '2024-03-25T20:45:00Z',
    author: 'RS',
    imageUrl: 'https://images.unsplash.com/photo-1535320485706-44d43b91d530?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'reflection-vid-1',
    title: 'Reflection: The Psychology of a Bear Market',
    excerpt: 'A video reflection on managing emotional bias during periods of high volatility.',
    content: 'In this video reflection, I discuss the common psychological traps traders fall into when the markers are red. Specifically, we cover loss aversion and how it prevents us from exiting losing positions. I share my personal framework for remaining objective when my portfolio value is fluctuating significantly.',
    category: Category.REFLECTIONS,
    date: '2024-03-23T12:00:00Z',
    author: 'RS',
    videoUrl: 'https://www.youtube.com/embed/fLeJJPxua3E',
    imageUrl: 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'Reflection: Why I Avoid Day Trading',
    excerpt: 'A weekly reflection on the merits of long-term wealth building over quick speculative gains.',
    content: 'This week, I reflected on the allure of quick profits. While the "get rich quick" stories are everywhere, the data consistently shows that time in the market beats timing the market. I discussed why I focus 90% of my capital on compounding assets and only leave 10% for high-conviction speculative plays.',
    category: Category.REFLECTIONS,
    date: '2024-03-22T11:30:00Z',
    author: 'RS',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: 'Trading 101: Understanding Candlestick Patterns',
    excerpt: 'A comprehensive video guide on reading price action like a professional institutional trader.',
    content: 'Watch as we break down hammers, dojis, and engulfing patterns. This session focuses on identifying reversals before they happen using volume-price confirmation.',
    category: Category.VIDEOS,
    date: '2024-03-20T18:00:00Z',
    author: 'RS',
    videoUrl: 'https://www.youtube.com/embed/SqcY0GlETPk',
    imageUrl: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=800'
  }
];
