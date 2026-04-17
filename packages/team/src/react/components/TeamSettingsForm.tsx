import React, { useState } from 'react';
import { useTeam } from '../hooks/useTeam';

export interface TeamSettingsFormProps {
  /** Current authenticated user's ID — for transfer ownership / delete confirmations */
  currentUserId: string;
  onDeleted?: () => void;
  className?: string;
}

/**
 * Team settings: update name/description, danger zone (delete / transfer ownership).
 */
export function TeamSettingsForm({ currentUserId, onDeleted, className = '' }: TeamSettingsFormProps) {
  const { currentTeam, currentRole, updateTeam, deleteTeam, transferOwnership } = useTeam();

  const [name, setName] = useState(currentTeam?.name ?? '');
  const [description, setDescription] = useState(currentTeam?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOwner = currentRole === 'owner';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateTeam({ name: name.trim(), description: description.trim() || undefined });
      setSaveMsg('Changes saved.');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail.trim()) return;
    setTransferring(true);
    setTransferError(null);
    try {
      await transferOwnership(transferEmail.trim());
      setTransferEmail('');
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm !== currentTeam?.name) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTeam();
      onDeleted?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (!currentTeam) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* General settings */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">General settings</h3>
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.startsWith('Changes') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {saveMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-6">
          <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-4">Danger zone</h3>

          {/* Transfer ownership */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer ownership</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Transfer ownership to another member's email. You'll become an admin.
            </p>
            <form onSubmit={(e) => void handleTransfer(e)} className="flex gap-2">
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="newowner@company.com"
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                type="submit"
                disabled={transferring || !transferEmail}
                className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                {transferring ? 'Transferring…' : 'Transfer'}
              </button>
            </form>
            {transferError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{transferError}</p>}
          </div>

          {/* Delete team */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delete team</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              This action cannot be undone. Type <strong className="text-gray-600 dark:text-gray-300">{currentTeam.name}</strong> to confirm.
            </p>
            <form onSubmit={(e) => void handleDelete(e)} className="flex gap-2">
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={currentTeam.name}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                type="submit"
                disabled={deleting || deleteConfirm !== currentTeam.name}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete team'}
              </button>
            </form>
            {deleteError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
