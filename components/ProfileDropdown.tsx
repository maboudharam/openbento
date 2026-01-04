import React, { useState, useRef, useEffect } from 'react';
import { SavedBento } from '../types';
import { getAllBentos, createBento, deleteBento } from '../services/storageService';
import { ChevronDown, Plus, FolderOpen, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileDropdownProps {
  activeBentoId: string;
  activeBentoName: string;
  onBentoChange: (bento: SavedBento) => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  activeBentoId,
  activeBentoName,
  onBentoChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bentos, setBentos] = useState<SavedBento[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load bentos when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setBentos(getAllBentos());
    }
  }, [isOpen]);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateBento = () => {
    if (newName.trim()) {
      const newBento = createBento(newName.trim());
      onBentoChange(newBento);
      setIsCreating(false);
      setNewName('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBento();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleDeleteBento = (e: React.MouseEvent, bentoId: string) => {
    e.stopPropagation();

    const bentoToDelete = bentos.find((b) => b.id === bentoId);
    if (!bentoToDelete) return;

    const confirmDelete = window.confirm(`Delete "${bentoToDelete.name}"? This cannot be undone.`);
    if (!confirmDelete) return;

    deleteBento(bentoId);
    const updatedBentos = getAllBentos();
    setBentos(updatedBentos);

    // If we deleted the active bento, switch to another one
    if (bentoId === activeBentoId && updatedBentos.length > 0) {
      onBentoChange(updatedBentos[0]);
    } else if (updatedBentos.length === 0) {
      // If no bentos left, create a new one
      const newBento = createBento('My Bento');
      onBentoChange(newBento);
      setIsOpen(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        aria-label="Open bento projects menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <FolderOpen size={16} className="text-gray-500" />
        <span className="max-w-[120px] truncate">{activeBentoName}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="Bento projects menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                My Bentos
              </h3>
            </div>

            {/* Bentos List */}
            <div className="max-h-[240px] overflow-y-auto">
              {bentos.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">No bentos yet</div>
              ) : (
                bentos.map((bento) => (
                  <div
                    key={bento.id}
                    className={`group w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      bento.id === activeBentoId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={`Switch to ${bento.name} project`}
                      aria-current={bento.id === activeBentoId ? 'true' : undefined}
                      onClick={() => {
                        onBentoChange(bento);
                        setIsOpen(false);
                      }}
                      className="flex-1 flex items-center gap-3 text-left min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          bento.id === activeBentoId
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {bento.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            bento.id === activeBentoId ? 'text-blue-600' : 'text-gray-900'
                          }`}
                        >
                          {bento.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Updated {formatDate(bento.updatedAt)}
                        </p>
                      </div>
                      {bento.id === activeBentoId && (
                        <Check size={16} className="text-blue-500 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${bento.name} project`}
                      onClick={(e) => handleDeleteBento(e, bento.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Delete bento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create New */}
            <div className="border-t border-gray-100">
              {isCreating ? (
                <div className="p-3">
                  <input
                    ref={inputRef}
                    type="text"
                    aria-label="New bento project name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Bento name..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      aria-label="Create new bento project"
                      onClick={handleCreateBento}
                      disabled={!newName.trim()}
                      className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel creating new bento"
                      onClick={() => {
                        setIsCreating(false);
                        setNewName('');
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Create new bento project"
                  onClick={() => setIsCreating(true)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Plus size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">New Bento</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
