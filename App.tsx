
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Post, Comment } from './types';
import { INITIAL_POSTS } from './constants';
import { enhanceNewsContent } from './services/geminiService';
import Navigation from './components/Navigation';
import PostCard from './components/PostCard';
import PostModal from './components/PostModal';
import CreatePostModal from './components/CreatePostModal';
import SettingsModal from './components/SettingsModal';
import CommunityChat from './components/CommunityChat';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [comments, setComments] = useState<Comment[]>([]);
  const [marketNews, setMarketNews] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [openInDiscussionMode, setOpenInDiscussionMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoadingNews(true);
      try {
        const sources = localStorage.getItem('setting-news-sources');
        const url = sources ? `/api/market-news?sources=${encodeURIComponent(JSON.parse(sources).join(','))}` : '/api/market-news';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setMarketNews(data);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setIsLoadingNews(false);
      }
    };

    fetchNews();

    // Listen for setting changes to re-fetch
    const handleSettingsUpdate = (e: StorageEvent) => {
      if (e.key === 'setting-news-sources') {
        fetchNews();
      }
    };
    window.addEventListener('storage', handleSettingsUpdate);
    return () => window.removeEventListener('storage', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    // Initial theme setup
    const savedTheme = localStorage.getItem('setting-theme') || 'light';
    document.documentElement.classList.remove('dark', 'cream');
    if (savedTheme !== 'light') {
      document.documentElement.classList.add(savedTheme);
    }
    
    (window as any).toggleSettings = () => setIsSettingsOpen(true);
    return () => { delete (window as any).toggleSettings; };
  }, []);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('init_posts', (sharedPosts: Post[]) => {
      // Merge initial posts with shared posts from server
      // Avoid duplicates if any
      setPosts((prev) => {
        const combined = [...sharedPosts, ...INITIAL_POSTS];
        const unique = combined.filter((post, index, self) =>
          index === self.findIndex((t) => t.id === post.id)
        );
        return unique;
      });
    });

    socketRef.current.on('new_post', (newPost: Post) => {
      setPosts((prev) => {
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    });

    socketRef.current.on('init_comments', (initialComments: Comment[]) => {
      setComments(initialComments);
    });

    socketRef.current.on('new_comment', (newComment: Comment) => {
      setComments((prev) => {
        if (prev.some(c => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    // Handle deep linking for shared posts
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (postId && posts.length > 0) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        setSelectedPost(post);
        // Clear param without refresh to keep URL clean
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [posts]);

  const handleUpdatePost = (updatedPost: Post) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    setMarketNews(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    if (selectedPost?.id === updatedPost.id) {
      setSelectedPost(updatedPost);
    }
  };

  const isCommunityActive = activeCategory === Category.COMMUNITY;

  const filteredPosts = useMemo(() => {
    let combined = [...posts];
    
    // Add dynamic news
    if (marketNews.length > 0) {
      combined = [...marketNews, ...posts];
      // Keep UNIQUE by ID (server might return some that are already in INITIAL_POSTS if we had any)
      combined = combined.filter((post, index, self) =>
        index === self.findIndex((t) => t.id === post.id)
      );
    }

    if (activeCategory === 'All') {
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return combined
      .filter(post => post.category === activeCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [posts, marketNews, activeCategory]);

  const handleCreatePost = (newPost: Post) => {
    socketRef.current?.emit('create_post', newPost);
    setIsCreating(false);
  };

  const handleAddComment = (postId: string, text: string, author: string, replyToId?: string) => {
    socketRef.current?.emit('add_comment', { postId, text, author, replyToId });
  };

  const handleSelectPost = (post: Post, discussionMode: boolean = false) => {
    setOpenInDiscussionMode(discussionMode);
    setSelectedPost(post);
  };

  return (
    <div className="min-h-screen selection:bg-black selection:text-white">
      <Navigation 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
        onNewPost={() => setIsCreating(true)}
      />

      <main className="max-w-6xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <header className="mb-20 max-w-2xl">
              <h1 className="text-5xl font-bold mb-6 serif tracking-tight flex items-center">
                {isCommunityActive ? 'Weekly Explorers Lounge.' : (activeCategory === 'All' ? 'Enjoy.' : activeCategory)}
                {activeCategory === Category.NEWS && isLoadingNews && (
                  <span className="ml-6 flex space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </span>
                )}
              </h1>
              {activeCategory === Category.NEWS && (
                <p className="text-gray-400 text-lg font-light leading-relaxed">
                  Real-time market insights from WSJ, Yahoo Finance, CNBC, and Bloomberg.
                </p>
              )}
              {isCommunityActive && (
                <p className="text-gray-400 text-lg font-light leading-relaxed">
                  Connect with other members in real-time.
                </p>
              )}
            </header>

            {isCommunityActive ? (
              <CommunityChat />
            ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {filteredPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onClick={(p) => handleSelectPost(p, false)}
                    onDiscussionClick={(p) => handleSelectPost(p, true)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-40 border border-dashed border-gray-100 rounded-3xl">
                <p className="text-gray-400 font-light italic">No content found in this category yet.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-20 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs tracking-widest uppercase">
        <div className="mb-4 md:mb-0">© 2024 RS. All rights reserved.</div>
        <div className="flex space-x-8">
          <a href="#" className="hover:text-black transition-colors">Twitter</a>
          <a href="#" className="hover:text-black transition-colors">Newsletter</a>
          <a href="#" className="hover:text-black transition-colors">About</a>
        </div>
      </footer>

      <AnimatePresence>
        {selectedPost && (
          <PostModal 
            key={selectedPost.id}
            post={selectedPost} 
            comments={comments.filter(c => c.postId === selectedPost.id)}
            onAddComment={handleAddComment}
            onUpdatePost={handleUpdatePost}
            onClose={() => setSelectedPost(null)}
            initialSplitMode={openInDiscussionMode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreating && (
          <CreatePostModal 
            onClose={() => setIsCreating(false)} 
            onSubmit={handleCreatePost} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
