import React, { useEffect, useState, useRef } from 'react';
import { apiGet, apiPut } from '../../js/httpClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBar from '../../components/SearchBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaginationControls from '../../components/PaginationControls';
import { toast } from '../../utils/toast';
import { useTheme } from '../../contexts/ThemeContext';
import { FaStar, FaTimes, FaEnvelope, FaPhone, FaFingerprint, FaRobot, FaUser } from 'react-icons/fa';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

const statusColors = {
  open: 'bg-blue-500',
  escalated: 'bg-red-500',
  converted: 'bg-green-500',
  closed: 'bg-gray-500',
};

const intentColors = {
  booking: 'bg-green-600',
  inquiry: 'bg-blue-600',
  support: 'bg-orange-500',
};

const ChatConversationsAdmin = () => {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detail modal
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editQuality, setEditQuality] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef(null);

  const statusFilter = searchParams.get('status') || 'all';

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const data = await apiGet(`/chatbot/conversations?status=${statusFilter}&page=1&limit=500`, token);
      setConversations(data.conversations || []);
      setFilteredConversations(data.conversations || []);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load conversations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  useEffect(() => {
    let filtered = [...conversations];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.visitorName?.toLowerCase().includes(query) ||
          c.visitorEmail?.toLowerCase().includes(query)
      );
    }
    setFilteredConversations(filtered);
    setCurrentPage(1);
  }, [searchQuery, conversations]);

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredConversations.slice(startIndex, startIndex + itemsPerPage);

  const openDetail = async (conv) => {
    setDetailLoading(true);
    setSelectedConversation(null);
    try {
      const token = localStorage.getItem('adminToken');
      const full = await apiGet(`/chatbot/conversations/${conv.id}`, token);
      setSelectedConversation(full);
      setEditStatus(full.status || 'open');
      setEditQuality(full.quality || 0);
      setEditNotes(full.notes || '');
    } catch (err) {
      toast.error('Failed to load conversation details');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedConversation && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation]);

  const handleSave = async () => {
    if (!selectedConversation) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const updated = await apiPut(
        `/chatbot/conversations/${selectedConversation.id}`,
        {
          status: editStatus,
          quality: editQuality || undefined,
          notes: editNotes || undefined,
        },
        token
      );
      toast.success('Conversation updated');
      setSelectedConversation({ ...selectedConversation, ...updated });
      fetchConversations();
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setSelectedConversation(null);
    setEditStatus('');
    setEditQuality(0);
    setEditNotes('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (count, interactive = false, onChange = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`${star <= count ? 'text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
            size={interactive ? 20 : 14}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Chatbot Conversations</h1>
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => navigate(`/admin/chat-conversations${tab.value === 'all' ? '' : `?status=${tab.value}`}`)}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: statusFilter === tab.value ? colors.primary : colors.surface,
                color: statusFilter === tab.value ? '#fff' : colors.textSecondary,
                border: `1px solid ${statusFilter === tab.value ? colors.primary : colors.border}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by visitor name or email..."
          className="max-w-md"
        />
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm" style={{ color: colors.textSecondary }}>
        Showing {paginated.length} of {filteredConversations.length} conversations
      </div>

      {/* Conversation cards */}
      <div className="space-y-3 mb-6">
        {paginated.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <FaRobot className="mx-auto mb-3 text-4xl" style={{ color: colors.textSecondary }} />
            <p style={{ color: colors.textSecondary }}>No conversations found</p>
          </div>
        ) : (
          paginated.map((conv) => (
            <div
              key={conv.id}
              className="rounded-lg p-5 cursor-pointer hover:shadow-lg transition-shadow"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
              onClick={() => openDetail(conv)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{conv.visitorName}</h3>
                  <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                    {conv.visitorEmail}
                  </p>
                  {conv.messages?.[0] && (
                    <p className="text-sm mt-2 truncate" style={{ color: colors.textSecondary }}>
                      Last: {conv.messages[0].message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                  <div className="flex gap-2">
                    {conv.intent && (
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${intentColors[conv.intent] || 'bg-gray-500'}`}>
                        {conv.intent}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColors[conv.status] || 'bg-gray-500'}`}>
                      {conv.status}
                    </span>
                  </div>
                  {conv.quality > 0 && renderStars(conv.quality)}
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    {formatDate(conv.updatedAt || conv.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Detail Modal */}
      {(selectedConversation || detailLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
            style={{ backgroundColor: colors.surface, color: colors.text }}
          >
            {detailLoading ? (
              <div className="p-12 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: colors.border }}>
                  <div>
                    <h2 className="text-xl font-bold">{selectedConversation.visitorName}</h2>
                    <div className="flex gap-2 mt-1">
                      {selectedConversation.intent && (
                        <span className={`px-2 py-0.5 rounded-full text-xs text-white ${intentColors[selectedConversation.intent] || 'bg-gray-500'}`}>
                          {selectedConversation.intent}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColors[selectedConversation.status] || 'bg-gray-500'}`}>
                        {selectedConversation.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Visitor Info */}
                  <div className="rounded-lg p-4" style={{ backgroundColor: colors.backgroundSecondary, border: `1px solid ${colors.border}` }}>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                      Visitor Info
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <FaEnvelope style={{ color: colors.textSecondary }} />
                        <span>{selectedConversation.visitorEmail}</span>
                      </div>
                      {selectedConversation.visitorPhone && (
                        <div className="flex items-center gap-2">
                          <FaPhone style={{ color: colors.textSecondary }} />
                          <span>{selectedConversation.visitorPhone}</span>
                        </div>
                      )}
                      {selectedConversation.deviceFingerprint && (
                        <div className="flex items-center gap-2">
                          <FaFingerprint style={{ color: colors.textSecondary }} />
                          <span className="truncate text-xs font-mono">{selectedConversation.deviceFingerprint}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
                        Started {formatDate(selectedConversation.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Message Thread */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                      Messages ({selectedConversation.messages?.length || 0})
                    </h3>
                    <div
                      className="space-y-3 max-h-80 overflow-y-auto rounded-lg p-4"
                      style={{ backgroundColor: colors.backgroundSecondary, border: `1px solid ${colors.border}` }}
                    >
                      {selectedConversation.messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === 'visitor' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className="max-w-[75%] rounded-lg px-4 py-2.5"
                            style={{
                              backgroundColor: msg.sender === 'visitor' ? colors.primary + '20' : colors.surface,
                              border: `1px solid ${msg.sender === 'visitor' ? colors.primary + '40' : colors.border}`,
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {msg.sender === 'visitor' ? (
                                <FaUser size={10} style={{ color: colors.primary }} />
                              ) : (
                                <FaRobot size={10} style={{ color: colors.textSecondary }} />
                              )}
                              <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                                {msg.sender === 'visitor' ? selectedConversation.visitorName : 'Bot'}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="rounded-lg p-4" style={{ backgroundColor: colors.backgroundSecondary, border: `1px solid ${colors.border}` }}>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                      Admin Actions
                    </h3>
                    <div className="space-y-4">
                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full p-2 rounded text-sm"
                          style={{
                            backgroundColor: colors.background,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <option value="open">Open</option>
                          <option value="escalated">Escalated</option>
                          <option value="converted">Converted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      {/* Quality */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Quality Rating</label>
                        {renderStars(editQuality, true, setEditQuality)}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                          placeholder="Add admin notes..."
                          className="w-full p-2 rounded text-sm resize-none"
                          style={{
                            backgroundColor: colors.background,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 p-5 border-t" style={{ borderColor: colors.border }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 rounded text-white font-medium text-sm transition-colors"
                    style={{ backgroundColor: saving ? colors.textSecondary : colors.primary }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 rounded font-medium text-sm transition-colors"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatConversationsAdmin;
