'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Mail, Loader, CheckCircle2, Trash2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface Note {
  _id: string;
  sender: {
    name: string;
    username: string;
    role: string;
    position?: string;
  };
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotesPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noteId: string | null; senderName: string }>({
    isOpen: false,
    noteId: null,
    senderName: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchNotes();
    }
  }, [token]);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const res = await fetch('/api/notes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await res.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      addToast('Failed to load notes', 'error');
    } finally {
      setLoadingNotes(false);
    }
  };

  const markAsRead = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to mark note as read');
      }

      // Update local state
      setNotes(
        notes.map((note) =>
          note._id === noteId ? { ...note, read: true } : note
        )
      );
    } catch (error) {
      console.error('Error marking note as read:', error);
      addToast('Failed to mark note as read', 'error');
    }
  };

  const handleDeleteNote = (noteId: string, senderName: string) => {
    setDeleteModal({
      isOpen: true,
      noteId: noteId,
      senderName: senderName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.noteId) return;

    try {
      const res = await fetch(`/api/notes/${deleteModal.noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter((note) => note._id !== deleteModal.noteId));
      setDeleteModal({ isOpen: false, noteId: null, senderName: '' });
      addToast('Note deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting note:', error);
      addToast('Failed to delete note', 'error');
    }
  };

  const getRoleColor = (role: string, position?: string) => {
    switch (role) {
      case 'admin':
        return 'from-red-600 to-red-700 text-red-100';
      case 'sales':
        if (position === 'Team Leader') {
          return 'from-purple-600 to-purple-700 text-purple-100';
        }
        return 'from-blue-600 to-blue-700 text-blue-100';
      default:
        return 'from-slate-600 to-slate-700 text-slate-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            <Mail className="inline-block mr-3 text-blue-400" size={40} />
            Notes
          </h1>
          <p className="text-slate-400">Messages sent to you</p>
        </div>

        {loadingNotes ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={40} className="animate-spin text-blue-400" />
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-16 text-center border border-slate-700">
            <Mail size={48} className="mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 text-lg">No notes yet</p>
            <p className="text-slate-400 text-sm mt-2">You will receive notes from your admin or team leader here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unread Count */}
            {notes.some((n) => !n.read) && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg p-4 text-white mb-6">
                <p className="font-semibold">
                  {notes.filter((n) => !n.read).length} unread note
                  {notes.filter((n) => !n.read).length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Notes List */}
            {notes.map((note) => (
              <div
                key={note._id}
                className={`rounded-xl border transition-all duration-200 ${
                  note.read
                    ? 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700 hover:border-slate-600'
                    : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-blue-500/50 hover:border-blue-400/50 shadow-lg shadow-blue-500/10'
                }`}
              >
                {/* Note Header */}
                <div className="p-6 border-b border-slate-700 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Sender Badge */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(note.sender.role, note.sender.position)} flex items-center justify-center font-bold text-sm`}
                      >
                        {note.sender.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Sender Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">
                          {note.sender.name}
                        </h3>
                        {note.sender.position && (
                          <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full whitespace-nowrap">
                            {note.sender.position}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded-full capitalize font-semibold ${
                            note.sender.role === 'admin'
                              ? 'bg-red-600/20 text-red-400'
                              : 'bg-blue-600/20 text-blue-400'
                          }`}
                        >
                          {note.sender.role}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">@{note.sender.username}</p>
                    </div>
                  </div>

                  {/* Read Status & Time */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(note.createdAt)}
                    </span>
                    {!note.read && (
                      <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Note Content */}
                <div className="p-6 bg-slate-900/30">
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                    {note.message}
                  </p>
                </div>

                {/* Note Footer - Actions */}
                <div className="p-4 bg-slate-900/20 border-t border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {note.read ? (
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <CheckCircle2 size={16} />
                        Read
                      </div>
                    ) : (
                      <button
                        onClick={() => markAsRead(note._id)}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        <CheckCircle2 size={16} />
                        Mark as Read
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteNote(note._id, note.sender.name)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                    title="Delete note"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600/20 to-red-600/10 border-b border-red-500/30 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500/20 p-3 rounded-lg">
                    <AlertTriangle className="text-red-400" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Delete Note</h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                <p className="text-slate-300">
                  Are you sure you want to delete this note from{' '}
                  <span className="font-semibold text-blue-400">{deleteModal.senderName}</span>?
                </p>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">This action:</p>
                  <ul className="text-sm text-slate-300 space-y-1 ml-2">
                    <li>✕ Cannot be undone</li>
                    <li>✕ Will permanently remove this message</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-700 bg-slate-900/50">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, noteId: null, senderName: '' })}
                  className="flex-1 px-4 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/50"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
