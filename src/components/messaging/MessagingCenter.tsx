import React, { useState } from 'react';
import { UserProfile, Conversation, Message } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal } from '../common/UIComponents';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  User,
  Check,
  CheckCheck,
  GraduationCap,
  Sparkles,
  Paperclip
} from 'lucide-react';

interface MessagingCenterProps {
  currentUser: UserProfile;
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    storage.getConversations(currentUser.id)
  );
  const [selectedConvId, setSelectedConvId] = useState<string>(
    conversations[0]?.id || ''
  );
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // New Chat form states
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [chatTopic, setChatTopic] = useState('');
  const [initialMsg, setInitialMsg] = useState('');

  const allProfiles = storage.getProfiles();
  const teachers = storage.getTeachers();
  const parents = storage.getParents();
  const students = storage.getStudents();

  // Load active conversation & messages
  const activeConversation = conversations.find((c) => c.id === selectedConvId);
  const messages = selectedConvId ? storage.getMessages(selectedConvId) : [];

  // Allowed recipients based on RBAC rules:
  // - Parent can only message teachers of their children or admin
  // - Teacher can message parents of their students or admin
  // - Admin can message anyone
  let allowedRecipients = allProfiles.filter((p) => p.id !== currentUser.id);

  if (currentUser.role === 'parent') {
    allowedRecipients = allProfiles.filter((p) => p.role === 'teacher' || p.role === 'admin');
  } else if (currentUser.role === 'teacher') {
    allowedRecipients = allProfiles.filter((p) => p.role === 'parent' || p.role === 'admin');
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConvId) return;

    storage.sendMessage(selectedConvId, messageText.trim(), currentUser);
    setMessageText('');
    setConversations(storage.getConversations(currentUser.id));
  };

  const handleStartNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId || !chatTopic || !initialMsg) return;

    const newConv = storage.startConversation(
      [selectedRecipientId],
      chatTopic,
      initialMsg,
      currentUser
    );

    setConversations(storage.getConversations(currentUser.id));
    setSelectedConvId(newConv.id);
    setShowNewChatModal(false);
    setChatTopic('');
    setInitialMsg('');
  };

  const filteredConversations = conversations.filter((c) =>
    (c.subject_topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.last_message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.student_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            مركز التواصل والرسائل المدرسية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            قنوات اتصال آمنة ومباشرة بين المعلمين وأولياء الأمور وإدارة المدرسة
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (allowedRecipients.length > 0) setSelectedRecipientId(allowedRecipients[0].id);
            setShowNewChatModal(true);
          }}
        >
          محادثة جديدة
        </Button>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Left column (RTL): Conversations list */}
        <Card className="p-0 overflow-hidden flex flex-col md:col-span-1 border-slate-200">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث في المحادثات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                لا توجد محادثات مطابقة
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const otherParticipantId = c.participant_ids.find((id) => id !== currentUser.id);
                const otherUser = allProfiles.find((p) => p.id === otherParticipantId);

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full p-3.5 text-right transition cursor-pointer flex items-start gap-3 ${
                      isSelected ? 'bg-blue-50/80 border-r-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.full_name || 'مستخدم')}&background=0D8ABC&color=fff`}
                      alt={otherUser?.full_name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs truncate">
                          {otherUser?.full_name || 'مستخدم'}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(c.last_message_at).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-blue-700 truncate mt-0.5">
                        {c.subject_topic}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.last_message}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right column (RTL): Active Chat Thread */}
        <Card className="p-0 overflow-hidden flex flex-col md:col-span-2 border-slate-200">
          {activeConversation ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{activeConversation.subject_topic}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    محادثة رسمية موثقة برقم الجلسة #{activeConversation.id.substring(0, 8)}
                  </p>
                </div>
                <Badge variant="primary" size="sm">محادثة نشطة</Badge>
              </div>

              {/* Message Bubbles Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {messages.map((m) => {
                  const isMe = m.sender_id === currentUser.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-700">{m.sender_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <p>{m.content}</p>
                      </div>

                      <div className="mt-1 px-1 flex items-center gap-1 text-[10px] text-slate-400">
                        {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="اكتب ردك أو استفسارك هنا..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 text-xs px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                  />
                  <Button type="submit" variant="secondary" icon={<Send className="w-4 h-4" />}>
                    إرسال
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">حدد محادثة من القائمة أو ابدأ مراسلة جديدة</p>
              <p className="text-xs text-slate-400 mt-1">تتيح لك المنصة التواصل الآمن مع المعلمين وأولياء الأمور</p>
            </div>
          )}
        </Card>
      </div>

      {/* START NEW CHAT MODAL */}
      {showNewChatModal && (
        <Modal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          title="بدء محادثة جديدة"
          subtitle="مراسلة رسمية ضمن نطاق الصلاحيات الأكاديمية"
        >
          <form onSubmit={handleStartNewChat} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المستلم *</label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                {allowedRecipients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role === 'teacher' ? 'معلم' : p.role === 'admin' ? 'إدارة' : 'ولي أمر'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">موضوع المحادثة *</label>
              <input
                type="text"
                required
                placeholder="مثال: استفسار حول خطة مراجعة مادة الفيزياء"
                value={chatTopic}
                onChange={(e) => setChatTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">نص الرسالة الافتتاحية *</label>
              <textarea
                rows={3}
                required
                placeholder="اكتب رسالتك باحترام ووضوح..."
                value={initialMsg}
                onChange={(e) => setInitialMsg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNewChatModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="secondary">
                إرسال وبدء المحادثة
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
