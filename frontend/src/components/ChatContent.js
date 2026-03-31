'use client';

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import ReactMarkdown from "react-markdown";
import { FundCard } from './FundChatCard';
import { useAuth } from '../contexts/AuthContext';
import { useChatSidebar } from '../contexts/ChatSidebarContext';

const TopHoldings = lazy(() => import('./artifact/TopHoldings'));
const FundInfo = lazy(() => import('./artifact/FundInfo'));
const StockInfo = lazy(() => import('./artifact/StockInfo'));
const StockSearchResults = lazy(() => import('./artifact/StockSearchResults'));

import { API_BASE_URL } from '@/config/api';

export default function ChatContent({ conversationId = null }) {
  const router = useRouter();
  const { getSessionToken } = useAuth();
  const { isSidebarOpen, setIsSidebarOpen } = useChatSidebar();
  const t = useTranslations('chatContent');
  const tCommon = useTranslations('common');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [conversationTitle, setConversationTitle] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationsLoadedRef = useRef(false);
  const messagesLoadedRef = useRef(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = useCallback(async () => {
    // Prevent duplicate calls
    if (conversationsLoadedRef.current) return;
    conversationsLoadedRef.current = true;

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.conversations);
        }
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  const loadConversationMessages = useCallback(async (convId) => {
    // Prevent duplicate calls for the same conversation
    if (messagesLoadedRef.current.has(convId)) return;
    messagesLoadedRef.current.add(convId);

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${convId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversationTitle(data.conversation.title);
          // Transform messages to match our format
          const formattedMessages = [];
          data.messages.forEach(msg => {
            // Add the main message
            formattedMessages.push({
              id: msg.id,
              type: msg.type,
              content: msg.content,
              timestamp: new Date(msg.timestamp)
            });
            
            // If message has artifact, add artifact message
            if (msg.artifact) {
              const artifactMessage = {
                id: msg.id + '_artifact',
                type: 'artifact',
                artifact: msg.artifact,
                isin: msg.isin,
                timestamp: new Date(msg.timestamp)
              };
              formattedMessages.push(artifactMessage);
            }
          });
          setMessages(formattedMessages);
        }
      } else {
        if (response.status === 401) {
          router.push('/login');
        }
        console.error('Failed to load conversation messages');
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
    }
  }, []);

  // Load user conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId);
    } else {
      // Clear messages and conversation state when no conversation is selected
      setMessages([]);
      setCurrentConversationId(null);
      setConversationTitle('');
      // Reset the messages loaded ref for new conversations
      messagesLoadedRef.current.clear();
    }
  }, [conversationId, loadConversationMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        throw new Error('No session token found');
      }

      // Determine endpoint based on whether we have a conversation ID
      const endpoint = currentConversationId 
        ? `${API_BASE_URL}/api/chat/${currentConversationId}`
        : `${API_BASE_URL}/api/chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // If this was a new conversation, update the conversation ID and redirect
      if (data.is_new && data.conversation_id) {
        setCurrentConversationId(data.conversation_id);
        router.replace(`/chat/${data.conversation_id}`);
      } else {
        // If this was not a new conversation, add the AI message and artifact message
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response || t('message.error'),
          timestamp: new Date()
        };
  
        setMessages(prev => [...prev, aiMessage]);
  
        if (data.artifact) {
          const artifactMessage = {
            id: Date.now() + 2,
            type: 'artifact',
            artifact: data.artifact,
            isin: data.isin,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, artifactMessage]);
        }
      }

      conversationsLoadedRef.current = false;
      loadConversations(); 
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: t('message.error'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseMessageContent = (content) => {
    // Check if message contains structured fund data
    if (content.includes('STRUCTURED_FUND_DATA:')) {
      const parts = content.split('STRUCTURED_FUND_DATA:');
      const jsonPart = parts[1];

      try {
        const fundResponse = JSON.parse(jsonPart);
        return (
            <FundCard fundResponse={fundResponse} />
        );
      } catch (e) {
        console.error('Error parsing fund data:', e);
        return parseFormattedText(content);
      }
    }

    // Regular text message with markdown formatting support
    return parseFormattedText(content);
  };

  const ArtifactLoader = () => (
    <div className="flex items-center space-x-2 p-4 text-gray-400 text-sm">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
      <span>Loading...</span>
    </div>
  );

  const parseArtifact = (artifact, isin) => {
    let component = null;
    if (artifact === 'top_holdings') {
      component = <TopHoldings isin={isin} />;
    } else if (artifact === 'fund_info') {
      component = <FundInfo isin={isin} />;
    } else if (artifact === 'stock_info') {
      component = <StockInfo ticker={isin} />;
    } else if (artifact === 'stock_search_results') {
      component = <StockSearchResults isin={isin} />;
    }
    return component ? <Suspense fallback={<ArtifactLoader />}>{component}</Suspense> : null;
  };

  const parseFormattedText = (text) => {
    return (
      <div className="text-black text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            // Custom styling for ordered lists
            ol: ({ children }) => (
              <ol className="list-none list-inside space-y-1 my-4 ml-4">
                {children}
              </ol>
            ),
            // Custom styling for list items
            li: ({ children }) => (
              <li className="text-sm leading-relaxed">{children}</li>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-1 mb-4 ml-4">
                {children}
              </ul>
            ),
            p: ({ children }) => (
              <p className="text-sm leading-relaxed mb-4">{children}</p>
            ),
            // Ensure bold text renders properly
            strong: ({ children }) => (
              <strong className="font-semibold">
                {children}
              </strong>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mb-4">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mb-4">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-bold mb-4">
                {children}
              </h4>
            ),
            h5: ({ children }) => (
              <h5 className="text-sm font-bold mb-4">
                {children}
              </h5>
            ),
            h6: ({ children }) => (
              <h6 className="text-xs font-bold mb-4">
                {children}
              </h6>
            ),
          }}>
            {text}
        </ReactMarkdown>
      </div>
    );
  };

  const quickPrompts = [
    "Quiero informarme sobre $GOOGL",
    "empresas de energia en Canadá",
    "Cuales son los 3 fondos con mejor rendimiento en los últimos 90 días?",
    "Quiero saber más sobre el fondo IE0032126645",
    "¿En qué empresas invierte el fondo LU1482751903?",
    "¿Qué fondos invierten en $AAPL?",
  ];

  const handleQuickPrompt = (prompt) => {
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  const formatConversationTime = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diff = now - messageDate;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `hace ${days}d`;
    } else if (hours > 0) {
      return `hace ${hours}h`;
    } else {
      return 'Ahora mismo';
    }
  };

  const getLastMessage = (conversation) => {
    // For now, just show the title truncated
    return conversation.title.length > 60 ? conversation.title.substring(0, 60) + '...' : conversation.title;
  };

  const handleConversationClick = (convId) => {
    router.push(`/chat/${convId}`);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleNewChat = () => {
    router.push('/chat');
    setIsSidebarOpen(false); // Close sidebar on mobile after creating new chat
  };

  return (
    <div className="bg-[#fff1e0] h-full flex relative">
      {/* Layer 1: Mobile Backdrop Overlay (z-40) - Behind sidebar, above content */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Layer 2: Conversations Sidebar */}
      {/* Desktop: Static flow (no z-index) | Mobile: Fixed z-50 (above backdrop) */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 md:z-auto
        w-80 border-r-2 border-black bg-white flex flex-col h-full shadow-lg md:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg 
              className="w-5 h-5 text-black" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h2 className="text-lg font-bold text-black serif uppercase tracking-tight">{t('sidebar.title')}</h2>
          </div>
          {/* Close button - Only visible on mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-black hover:text-white transition-all duration-200 border border-transparent hover:border-black"
            aria-label="Close menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="border-2 border-dashed border-gray-300 p-6 bg-gray-50">
                <svg 
                  className="w-12 h-12 text-gray-400 mx-auto mb-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-sm text-gray-600 font-medium">
                  {t('sidebar.noConversations')}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`
                    mb-2 p-3 border-2 cursor-pointer transition-all duration-200
                    ${conversation.id == currentConversationId 
                      ? 'border-black bg-black text-[#fff1e0] shadow-md' 
                      : 'border-gray-300 bg-white hover:border-black hover:shadow-md'
                    }
                  `}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`
                      text-sm font-bold truncate flex-1 mr-2 serif
                      ${conversation.id == currentConversationId ? 'text-[#fff1e0]' : 'text-black'}
                    `}>
                      {conversation.title}
                    </h3>
                    <span className={`
                      text-xs whitespace-nowrap font-semibold
                      ${conversation.id == currentConversationId ? 'text-[#fff1e0]/80' : 'text-gray-500'}
                    `}>
                      {formatConversationTime(conversation.created_at)}
                    </span>
                  </div>
                  <p className={`
                    text-xs overflow-hidden leading-relaxed
                    ${conversation.id == currentConversationId ? 'text-[#fff1e0]/90' : 'text-gray-600'}
                  `} style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                    {getLastMessage(conversation)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-t-2 border-black bg-white">
          <button
            className="w-full bg-black hover:bg-gray-800 text-[#fff1e0] px-6 py-3 font-bold text-sm transition-all duration-200 uppercase tracking-wide border-2 border-black hover:shadow-lg flex items-center justify-center space-x-2"
            onClick={handleNewChat}
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>{t('sidebar.newChat')}</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area - Right Side */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#fff1e0] overflow-hidden relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto pb-16">
          <div className="pt-6 pb-6">
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const showSeparator = previousMessage && previousMessage.type !== message.type;
              
              // Artifact messages - Full width with safety margins
              if (message.type === 'artifact') {
                return (
                  <div key={message.id}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                      {parseArtifact(message.artifact, message.isin)}
                    </div>
                  </div>
                );
              }
              
              // User messages - Centered container, right-aligned white box
              if (message.type === 'user') {
                return (
                  <div key={message.id}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                      <div className="flex justify-end">
                        <div className="bg-white border-2 border-gray-300 px-4 py-3 shadow-lg max-w-3xl">
                          <p className="text-black text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // AI messages - Centered container, free-flowing content
              if (message.type === 'ai') {
                return (
                  <div key={message.id}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                      <div className="max-w-4xl">
                        {parseMessageContent(message.content)}
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null;
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="max-w-4xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Prompts - Only show when there's no conversation ID and no messages */}
        {!currentConversationId && messages.length === 0 && (
          <div className="flex-shrink-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="bg-white border-2 border-black p-6 mb-4">
              <h3 className="text-lg font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('quickPrompts.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-left p-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm text-black transition-all duration-200 font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Layer 4: Chat Input - Fixed at bottom */}
        {/* Mobile: Full width (left-0), z-30 below sidebar */}
        {/* Desktop: Offset by sidebar width (md:left-80), z-20 in flow */}
        <div className="fixed bottom-0 left-0 md:left-80 right-0 z-30 md:z-20 border-t-2 border-black bg-[#fff1e0]">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t('input.placeholder')}
                  className="w-full bg-white border-2 border-black px-4 py-3 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-black shadow-lg"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-[#fff1e0] px-6 py-3 font-bold text-sm transition-colors duration-200 uppercase tracking-wide"
              >
                {isLoading ? tCommon('button.sending') : tCommon('button.send')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
