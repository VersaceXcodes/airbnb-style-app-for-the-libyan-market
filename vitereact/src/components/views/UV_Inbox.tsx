import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// Types based on backend schemas
interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  booking_id: string | null;
  created_at: string;
  sender_name?: string;
  sender_photo?: string;
}

interface Thread {
  thread_id: string;
  other_user: {
    id: string;
    name: string;
    profile_picture_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  };
  unread_count: number;
}

interface ActiveThread {
  messages: Message[];
  other_user: {
    id: string;
    name: string;
    profile_picture_url: string | null;
  };
}

// API functions
const fetchUserThreads = async (token: string): Promise<Thread[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data.map((thread: any) => ({
    thread_id: thread.thread_id,
    other_user: {
      id: thread.other_user._id || thread.other_user.id,
      name: thread.other_user.name,
      profile_picture_url: thread.other_user.profile_picture_url
    },
    last_message: thread.last_message,
    unread_count: thread.unread_count
  }));
};

const fetchThreadMessages = async (threadId: string, token: string): Promise<ActiveThread> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages/${threadId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const messages = response.data.map((msg: any) => ({
    ...msg,
    sender_id: msg.sender_id._id || msg.sender_id,
    receiver_id: msg.receiver_id._id || msg.receiver_id
  }));
  
  const otherUser = messages.length > 0 
    ? messages[0].sender_id === messages[0].receiver_id
      ? messages[0]
      : messages.find((m: any) => m.sender_id !== messages.find((msg: any) => msg.sender_id === m.sender_id)?.sender_id)
    : null;

  return {
    messages,
    other_user: otherUser ? {
      id: otherUser.sender_id,
      name: otherUser.sender_name || 'Unknown',
      profile_picture_url: otherUser.sender_photo
    } : { id: '', name: 'Unknown', profile_picture_url: null }
  };
};

const sendMessage = async (threadId: string, content: string, receiverId: string, bookingId: string | null, token: string): Promise<Message> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages/${threadId}`,
    {
      receiver_id: receiverId,
      content,
      booking_id: bookingId
    },
    {
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

const markMessagesAsRead = async (messageIds: string[], token: string): Promise<void> => {
  await Promise.all(
    messageIds.map(messageId =>
      axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages/${messageId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
    )
  );
};

const UV_Inbox: React.FC = () => {
  const { thread_id } = useParams<{ thread_id?: string }>();
  const [newMessageContent, setNewMessageContent] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(thread_id || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Individual Zustand selectors (not destructuring)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  const queryClient = useQueryClient();

  // Query for user threads
  const {
    data: threads = [],
    isLoading: threadsLoading,
    error: threadsError,
    refetch: refetchThreads
  } = useQuery({
    queryKey: ['threads'],
    queryFn: () => fetchUserThreads(authToken!),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Query for active thread messages
  const {
    data: activeThread,
    isLoading: messagesLoading,
    error: messagesError
  } = useQuery({
    queryKey: ['thread', selectedThreadId],
    queryFn: () => fetchThreadMessages(selectedThreadId!, authToken!),
    enabled: !!selectedThreadId && !!authToken,
    staleTime: 10000 // 10 seconds
  });

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: ({ receiverId, content, bookingId }: { 
      receiverId: string; 
      content: string; 
      bookingId: string | null;
    }) => sendMessage(selectedThreadId!, content, receiverId, bookingId, authToken!),
    onSuccess: (newMessage) => {
      // Optimistically update the messages
      queryClient.setQueryData(['thread', selectedThreadId], (old: ActiveThread | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, newMessage]
        };
      });
      
      // Update threads list to reflect new last message
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      
      // Clear input
      setNewMessageContent('');
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    }
  });

  // Mark messages as read when thread becomes active
  useEffect(() => {
    if (activeThread && currentUser) {
      const unreadMessages = activeThread.messages.filter(
        msg => !msg.is_read && msg.receiver_id === currentUser.id
      );
      
      if (unreadMessages.length > 0) {
        markMessagesAsRead(
          unreadMessages.map(msg => msg.id),
          authToken!
        ).then(() => {
          // Update local state to mark as read
          queryClient.setQueryData(['thread', selectedThreadId], (old: ActiveThread | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map(msg =>
                unreadMessages.find(um => um.id === msg.id)
                  ? { ...msg, is_read: true }
                  : msg
              )
            };
          });
          
          // Update threads list to reduce unread count
          queryClient.invalidateQueries({ queryKey: ['threads'] });
        });
      }
    }
  }, [activeThread?.messages, currentUser, selectedThreadId, authToken, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  // Handle thread selection
  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessageContent.trim() || !activeThread || !currentUser) return;
    
    sendMessageMutation.mutate({
      receiverId: activeThread.other_user.id,
      content: newMessageContent.trim(),
      bookingId: activeThread.messages[0]?.booking_id || null
    });
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            <button
              onClick={() => refetchThreads()}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Refresh messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Threads List - Left Panel */}
          <div className="w-full md:w-96 border-r border-gray-200 flex flex-col">
            {threadsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : threadsError ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-red-600 mb-2">Failed to load messages</p>
                  <button
                    onClick={() => refetchThreads()}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                  <p className="mt-1 text-sm text-gray-500">Your conversations will appear here</p>
                  <div className="mt-6">
                    <Link
                      to="/"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Browse Properties
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    onClick={() => handleThreadSelect(thread.thread_id)}
                    className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                      selectedThreadId === thread.thread_id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {thread.other_user.profile_picture_url ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={thread.other_user.profile_picture_url}
                          alt={thread.other_user.name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {thread.other_user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {thread.other_user.name}
                        </p>
                        {thread.unread_count > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <p className={`text-sm truncate ${
                          thread.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                        }`}>
                          {thread.last_message.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(thread.last_message.created_at)} at {formatTime(thread.last_message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Thread - Right Panel */}
          <div className="hidden md:flex flex-1 flex-col">
            {selectedThreadId && activeThread ? (
              <>
                {/* Thread Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center">
                    {activeThread.other_user.profile_picture_url ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={activeThread.other_user.profile_picture_url}
                        alt={activeThread.other_user.name}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {activeThread.other_user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <h2 className="ml-3 text-lg font-medium text-gray-900">
                      {activeThread.other_user.name}
                    </h2>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : messagesError ? (
                    <div className="text-center">
                      <p className="text-red-600">Failed to load messages</p>
                    </div>
                  ) : activeThread.messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    activeThread.messages.map((message) => {
                      const isCurrentUser = message.sender_id === currentUser?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isCurrentUser
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              {formatTime(message.created_at)}
                              {!message.is_read && isCurrentUser && (
                                <span className="ml-2">
                                  <svg className="inline w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 px-6 py-4">
                  <form onSubmit={handleSendMessage} className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessageContent}
                      onChange={(e) => {
                        setNewMessageContent(e.target.value);
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      disabled={sendMessageMutation.isPending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessageContent.trim() || sendMessageMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {sendMessageMutation.isPending ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Select a conversation</h3>
                  <p className="mt-1 text-sm text-gray-500">Choose a thread from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Thread Switcher */}
        {selectedThreadId && activeThread && (
          <div className="md:hidden border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedThreadId(null)}
                  className="text-gray-500 mr-3"
                  aria-label="Back to threads"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {activeThread.other_user.profile_picture_url ? (
                  <img
                    className="h-8 w-8 rounded-full object-cover"
                    src={activeThread.other_user.profile_picture_url}
                    alt={activeThread.other_user.name}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {activeThread.other_user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="ml-3 font-medium text-gray-900">{activeThread.other_user.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Inbox;