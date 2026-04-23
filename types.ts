
export enum Category {
  VIDEOS = 'Videos',
  REFLECTIONS = 'Reflections',
  ARTICLES = 'Articles',
  NEWS = 'News',
  COMMUNITY = 'Community',
  MARKET_VIEW = 'Market View'
}

export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: Category;
  date: string;
  author: string;
  imageUrl?: string;
  videoUrl?: string;
  documentUrl?: string; // Support for PDFs/Docs
  readingTime?: string;
  url?: string; // External link for news articles
  conclusion?: string; // AI-powered market conclusion
}

export interface Comment {
  id: string;
  postId: string;
  text: string;
  author: string;
  date: string;
  replyToId?: string; // Support for threaded replies
}
