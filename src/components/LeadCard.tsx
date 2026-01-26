'use client';

import { useState } from 'react';

interface LeadCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  status: 'new' | 'connected' | 'negotiation' | 'closed';
  notes?: string;
  value?: number;
  onStatusChange?: (status: string) => void;
  onNotesChange?: (notes: string) => void;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'New' },
  connected: { bg: 'bg-green-100', text: 'text-green-800', label: 'Connected' },
  negotiation: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Negotiation' },
  closed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Closed' },
};

export default function LeadCard({
  id,
  name,
  email,
  phone,
  property,
  status,
  notes = '',
  value = 0,
  onStatusChange,
  onNotesChange,
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(notes);

  const statusColor = statusColors[status];

  const handleCall = () => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = () => {
    window.location.href = `mailto:${email}`;
  };

  const handleSaveNotes = () => {
    onNotesChange?.(editNotes);
    setIsExpanded(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <p className="text-sm text-gray-600">{property}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor.bg} ${statusColor.text}`}>
          {statusColor.label}
        </div>
      </div>

      <div className="space-y-2 mb-3 text-sm text-gray-700">
        <p>
          <span className="font-medium">Email:</span> {email}
        </p>
        <p>
          <span className="font-medium">Phone:</span> {phone}
        </p>
        {value > 0 && (
          <p>
            <span className="font-medium">Value:</span> ${value.toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleCall}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded text-sm font-medium"
        >
          Call
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm font-medium"
        >
          Email
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded text-sm font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t pt-3 mt-3">
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700">Update Status</label>
            <select
              value={status}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="new">New</option>
              <option value="connected">Connected</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
              placeholder="Add notes about this lead..."
            />
          </div>

          <button
            onClick={handleSaveNotes}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
