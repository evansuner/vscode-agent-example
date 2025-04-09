'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Highlight, themes } from 'prism-react-renderer';

// 消息类型定义
type MessageType = {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: Date;
};

// 会话类型定义
type ConversationType = {
  id: string;
  title: string;
  messages: MessageType[];
  createdAt: Date;
  updatedAt: Date;
};

// 代码块渲染组件
const CodeBlock = ({language, value}: {language: string, value: string}) => {
  return (
    <Highlight
      theme={themes.nightOwl}
      code={value}
      language={language || 'text'}
    >
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre className="p-4 rounded-md overflow-auto text-sm" style={style}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">{language}</span>
            <button 
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-white"
              onClick={() => {
                navigator.clipboard.writeText(value);
              }}
            >
              复制
            </button>
          </div>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              <span className="mr-4 text-gray-500 text-xs select-none">{i + 1}</span>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};

// 默认的初始消息
const DEFAULT_WELCOME_MESSAGE = '你好！我是AI助手，有什么我可以帮助你的吗？';

// 默认空会话，避免初始化时使用随机值
const DEFAULT_EMPTY_CONVERSATION: ConversationType = {
  id: 'default-conversation',
  title: '新的对话',
  messages: [{
    id: 'welcome-message',
    content: DEFAULT_WELCOME_MESSAGE,
    role: 'ai',
    timestamp: new Date(0), // 使用固定日期
  }],
  createdAt: new Date(0), // 使用固定日期
  updatedAt: new Date(0), // 使用固定日期
};

// 格式化时间函数，使用固定格式避免本地化问题
const formatTime = (date: Date): string => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function Home() {
  // 添加客户端渲染标记，解决水合问题
  const [isClient, setIsClient] = useState(false);

  // 所有会话状态 - 使用空会话作为初始值
  const [conversations, setConversations] = useState<ConversationType[]>([DEFAULT_EMPTY_CONVERSATION]);
  
  // 当前会话ID状态
  const [currentConversationId, setCurrentConversationId] = useState<string>(DEFAULT_EMPTY_CONVERSATION.id);
  
  // 初始化会话，仅在客户端执行
  useEffect(() => {
    // 标记客户端渲染已完成
    setIsClient(true);
    
    // 从本地存储读取会话历史
    const saved = localStorage.getItem('ai-conversations');
    if (saved) {
      try {
        const parsedConversations = JSON.parse(saved);
        // 转换日期字符串为Date对象
        const convertedConversations = parsedConversations.map((conv: {
          id: string;
          title: string;
          messages: {
            id: string;
            content: string;
            role: 'user' | 'ai';
            timestamp: string;
          }[];
          createdAt: string;
          updatedAt: string;
        }) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        setConversations(convertedConversations);
        setCurrentConversationId(convertedConversations[0]?.id || DEFAULT_EMPTY_CONVERSATION.id);
      } catch (e) {
        console.error('Failed to parse stored conversations:', e);
        // 使用默认会话
        initializeNewConversation();
      }
    } else {
      // 没有保存的会话，创建新会话
      initializeNewConversation();
    }
  }, []);
  
  // 初始化新会话的辅助函数
  const initializeNewConversation = () => {
    const newConversationId = uuidv4();
    const newConversation: ConversationType = {
      id: newConversationId,
      title: '新的对话',
      messages: [{
        id: uuidv4(),
        content: DEFAULT_WELCOME_MESSAGE,
        role: 'ai',
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setConversations([newConversation]);
    setCurrentConversationId(newConversationId);
  };
  
  // 当前会话
  const currentConversation = useMemo(() => {
    return conversations.find(conv => conv.id === currentConversationId) || conversations[0];
  }, [conversations, currentConversationId]);
  
  // 当前会话中的消息
  const messages = useMemo(() => {
    return currentConversation?.messages || [];
  }, [currentConversation]);
  
  // 侧边栏状态
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 输入框状态
  const [input, setInput] = useState('');
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  
  // 语音输入状态
  const [isListening, setIsListening] = useState(false);
  
  // 消息容器引用，用于自动滚动
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 在消息列表更新时自动滚动
  useEffect(() => {
    if (isClient) {
      scrollToBottom();
    }
  }, [messages, isClient]);
  
  // 保存会话到本地存储
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('ai-conversations', JSON.stringify(conversations));
    }
  }, [conversations, isClient]);
  
  // 创建新会话
  const createNewConversation = () => {
    const newConversationId = uuidv4();
    const newConversation: ConversationType = {
      id: newConversationId,
      title: '新的对话',
      messages: [{
        id: uuidv4(),
        content: DEFAULT_WELCOME_MESSAGE,
        role: 'ai',
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(newConversationId);
    
    // 如果在移动设备上，创建新会话后关闭侧边栏
    if (isClient && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };
  
  // 删除会话
  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    // 如果删除的是当前会话，切换到第一个会话或创建新会话
    if (id === currentConversationId) {
      const remaining = conversations.filter(conv => conv.id !== id);
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  };
  
  // 处理发送消息
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // 生成唯一ID
    const userMessageId = uuidv4();
    
    // 添加用户消息
    const userMessage: MessageType = {
      id: userMessageId,
      content: input,
      role: 'user',
      timestamp: new Date(),
    };
    
    // 更新当前会话中的消息
    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, userMessage],
          updatedAt: new Date(),
          // 如果是第一条用户消息，以用户消息的前几个字作为会话标题
          title: conv.messages.filter(m => m.role === 'user').length === 0 
            ? input.slice(0, 15) + (input.length > 15 ? '...' : '')
            : conv.title
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    setInput('');
    setLoading(true);
    
    try {
      // 准备发送给API的消息
      const currentConv = updatedConversations.find(conv => conv.id === currentConversationId);
      const apiMessages = currentConv?.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })) || [];
      
      // 调用API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 添加AI响应 - 将API返回的'assistant'角色映射为前端显示用的'ai'角色
      const aiResponse: MessageType = {
        id: uuidv4(),
        content: data.content,
        role: 'ai', // 前端继续使用'ai'作为角色标识
        timestamp: new Date(),
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, aiResponse],
            updatedAt: new Date()
          };
        }
        return conv;
      }));
      
    } catch (error) {
      console.error('API调用失败:', error);
      
      // 在对话中添加错误消息
      const errorResponse: MessageType = {
        id: uuidv4(),
        content: "很抱歉，发生了一个错误。请稍后再试。",
        role: 'ai',
        timestamp: new Date(),
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, errorResponse],
            updatedAt: new Date()
          };
        }
        return conv;
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理键盘事件，按Enter发送消息
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // 语音输入处理
  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true);
      
      // 请求麦克风权限
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            // 这里通常会集成实际的语音识别API
            // 这里只是一个模拟，你需要集成真实的API
            
            // 模拟5秒后停止录音并添加模拟文本
            setTimeout(() => {
              setIsListening(false);
              setInput(prev => prev + " 这是语音识别的模拟文本");
              
              // 关闭麦克风流
              stream.getTracks().forEach(track => track.stop());
            }, 5000);
          })
          .catch(err => {
            console.error("Error accessing microphone:", err);
            setIsListening(false);
            alert("无法访问麦克风，请检查权限设置");
          });
      } else {
        alert("您的浏览器不支持语音输入");
        setIsListening(false);
      }
    } else {
      setIsListening(false);
      // 停止录音的逻辑会在上面的setTimeout中处理
    }
  };
  
  // 如果不是客户端，显示简单的加载状态
  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
          <p className="text-lg text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 侧边栏 - 会话列表 */}
      <div 
        className={`fixed md:static inset-0 bg-white z-30 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out w-64 border-r`}
      >
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">对话历史</h2>
          <button 
            onClick={createNewConversation}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition"
            aria-label="创建新会话"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          {conversations.map(conversation => (
            <div 
              key={conversation.id}
              className={`p-3 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                conversation.id === currentConversationId ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                setCurrentConversationId(conversation.id);
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
            >
              <div className="flex-1 truncate">
                <h3 className="truncate font-medium">{conversation.title}</h3>
                <p className="text-xs text-gray-500 truncate">
                  {conversation.messages.length} 条消息
                </p>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conversation.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 ml-2"
                aria-label="删除会话"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* 主要聊天区域 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 头部 */}
        <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            {/* 移动端侧边栏切换按钮 */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 mr-2 rounded-md hover:bg-gray-100"
              aria-label={sidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">AI 助手对话</h1>
          </div>
          
          <div>
            {/* 你可以在这里添加额外的头部元素，如设置按钮等 */}
          </div>
        </header>
        
        {/* 聊天内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* 头像 */}
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {message.role === 'user' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                  )}
                </div>
              </div>
              
              {/* 消息内容 - 使用React Markdown渲染 */}
              <div 
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {message.role === 'user' ? (
                  <div className="prose prose-sm max-w-none text-white">
                    {message.content}
                  </div>
                ) : (
                  <div className={`prose prose-sm max-w-none ${'text-gray-800'}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        code({className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '');
                          
                          if (match && typeof children === 'string') {
                            return (
                              <CodeBlock
                                language={match[1]}
                                value={children.replace(/\n$/, '')}
                              />
                            );
                          }
                          
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* 消息时间戳 - 使用固定格式 */}
                <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {/* 加载指示器 */}
          {loading && (
            <div className="flex items-start gap-3">
              {/* AI头像 */}
              <div className="flex-shrink-0 mr-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* 用于自动滚动的空div */}
          <div ref={messagesEndRef}></div>
        </div>
        
        {/* 输入区域 */}
        <div className="bg-white border-t p-4">
          <div className="flex flex-col gap-2 max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[5rem]"
                placeholder="输入消息或使用 / 命令..."
                rows={3}
              />
              
              {/* 语音输入按钮 */}
              <button
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2 rounded-full ${
                  isListening ? 'bg-red-500' : 'bg-gray-200 hover:bg-gray-300'
                } transition`}
                title="语音输入"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {isListening ? (
                  <span className="text-red-500 flex items-center">
                    <span className="mr-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    正在录音...
                  </span>
                ) : (
                  <span>按 Enter 发送，Shift + Enter 换行</span>
                )}
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-600 transition flex items-center gap-1"
              >
                <span>发送</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
