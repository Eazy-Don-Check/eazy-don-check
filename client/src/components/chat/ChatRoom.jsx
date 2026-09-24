import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Hash, 
  User, 
  Paperclip, 
  Smile, 
  MessageSquare, 
  Circle, 
  Image as ImageIcon,
  X,
  Users
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

// Default public chat rooms
const DEFAULT_ROOMS = [
  { id: 'general', name: 'General Lounge', description: 'Community discussions and general talk' },
  { id: 'tech', name: 'Tech & Dev', description: 'Full-stack, MERN, and AI development' },
  { id: 'design', name: 'Design & Prints', description: 'Branding, graphics, and visual design' }
];

export default function ChatRoom({ currentUser }) {
  const { 
    isConnected, 
    onlineUsers, 
    messages, 
    typingUsers, 
    joinRoom, 
    leaveRoom, 
    sendRoomMessage, 
    sendDirectMessage, 
    emitTyping 
  } = useSocket();

  // Active Chat Selection State: { type: 'room' | 'dm', targetId: string, name: string }
  const [activeChat, setActiveChat] = useState({ 
    type: 'room', 
    targetId: 'general', 
    name: 'General Lounge' 
  });

  const [inputMessage, setInputMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [directMessageUser, setDirectMessageUser] = useState(''); // Target user ID for new DMs
  const [showDmModal, setShowDmModal] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle joining/leaving rooms on selection change
  useEffect(() => {
    if (activeChat.type === 'room') {
      joinRoom(activeChat.targetId);
      return () => {
        leaveRoom(activeChat.targetId);
      };
    }
  }, [activeChat, joinRoom, leaveRoom]);

  // Handle Typing Indicator
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Emit typing event
    emitTyping({
      roomId: activeChat.type === 'room' ? activeChat.targetId : null,
      recipientId: activeChat.type === 'dm' ? activeChat.targetId : null,
      isTyping: true
    });

    // Clear existing timeout and set stop typing after 2 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping({
        roomId: activeChat.type === 'room' ? activeChat.targetId : null,
        recipientId: activeChat.type === 'dm' ? activeChat.targetId : null,
        isTyping: false
      });
    }, 2000);
  };

  // Submit Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && attachments.length === 0) return;

    if (activeChat.type === 'room') {
      sendRoomMessage(activeChat.targetId, inputMessage, attachments);
    } else {
      sendDirectMessage(activeChat.targetId, inputMessage, attachments);
    }

    // Stop typing indicator immediately on send
    emitTyping({
      roomId: activeChat.type === 'room' ? activeChat.targetId : null,
      recipientId: activeChat.type === 'dm' ? activeChat.targetId : null,
      isTyping: false
    });

    setInputMessage('');
    setAttachments([]);
  };

  // Filter messages relevant to the active channel/room or DM context
  const filteredMessages = messages.filter((msg) => {
    if (activeChat.type === 'room') {
      return msg.roomId === activeChat.targetId;
    } else {
      // Show DMs where either sender or recipient matches active direct message target
      return (
        (msg.senderId === activeChat.targetId && msg.recipientId === currentUser?._id) ||
        (msg.senderId === currentUser?._id && msg.recipientId === activeChat.targetId)
      );
    }
  });

  // Dynamic typing indicator text for active room/chat
  const typingKey = activeChat.type === 'room' ? `room_${activeChat.targetId}` : `dm_${activeChat.targetId}`;
  const currentTypingUser = typingUsers[typingKey];

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-7xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-slate-100 font-sans my-4">
      
      {/* SIDEBAR: Rooms & Direct Messages */}
      <div className="w-64 sm:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">Community Hub</h2>
          </div>
          {/* Socket Connection Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-400 text-[11px]">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          
          {/* Public Chat Rooms */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Rooms</span>
            </div>
            <div className="space-y-1">
              {DEFAULT_ROOMS.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveChat({ type: 'room', targetId: room.id, name: room.name })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    activeChat.type === 'room' && activeChat.targetId === room.id
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="text-left truncate">
                    <p className="font-semibold text-slate-200">{room.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Direct Messages</span>
              <button 
                onClick={() => setShowDmModal(true)}
                className="text-amber-400 hover:text-amber-300 text-xs font-normal lowercase"
              >
                + new
              </button>
            </div>

            {/* DM Active Selection Item */}
            {activeChat.type === 'dm' && (
              <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between">
                <span className="font-semibold text-amber-300 truncate">@{activeChat.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            )}
          </div>

        </div>

        {/* Current Logged-in User Card */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-sm">
              {currentUser.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.username || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>
        )}

      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-slate-950">
        
        {/* Chat Room Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            {activeChat.type === 'room' ? (
              <Hash className="w-5 h-5 text-amber-400" />
            ) : (
              <User className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                {activeChat.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeChat.type === 'room' ? 'Public discussion channel' : 'Direct encrypted message'}
              </p>
            </div>
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = (msg.sender?._id || msg.senderId) === currentUser?._id;
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {isMe ? 'You' : msg.sender?.username || 'Member'}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div 
                    className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                      isMe 
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none' 
                        : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Notification Bar */}
        {currentTypingUser && (
          <div className="px-6 py-1 text-[11px] text-amber-400 italic flex items-center gap-1.5 animate-pulse">
            <Circle className="w-2 h-2 fill-amber-400" />
            <span>{currentTypingUser} is typing...</span>
          </div>
        )}

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 focus-within:border-amber-500/50 transition">
            
            <input 
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder={`Message ${activeChat.type === 'room' ? `#${activeChat.name}` : `@${activeChat.name}`}...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white focus:outline-none placeholder:text-slate-500"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() && attachments.length === 0}
              className={`p-2 rounded-xl transition ${
                inputMessage.trim() || attachments.length > 0
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>

      {/* New Direct Message Modal */}
      {showDmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Start Direct Message</h3>
              <button onClick={() => setShowDmModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Recipient User ID or Username</label>
              <input 
                type="text"
                value={directMessageUser}
                onChange={(e) => setDirectMessageUser(e.target.value)}
                placeholder="Enter User ID"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => {
                if (directMessageUser.trim()) {
                  setActiveChat({ type: 'dm', targetId: directMessageUser.trim(), name: directMessageUser.trim() });
                  setShowDmModal(false);
                  setDirectMessageUser('');
                }
              }}
              className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition"
            >
              Open Direct Chat
            </button>
          </div>
        </div>
      )}

    </div>
  );
}