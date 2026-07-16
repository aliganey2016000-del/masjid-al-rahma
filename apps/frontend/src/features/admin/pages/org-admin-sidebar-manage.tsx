/**
 * Org Admin Sidebar Manager — Super Admin ONLY
 * Controls which items appear in the shared org_admin/teacher Admin Portal
 * sidebar, per organization. Unlike the student Tenant Sidebar Config page,
 * org_admin cannot edit this themselves — only a super admin decides what
 * an org's staff see in their own admin nav.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../store/auth-context';
import api from '../../../lib/axios';

interface SidebarItem { key: string; label: string; section: string; visible: boolean; }
interface SchoolBrief { _id: string; name: string; }

export function OrgAdminSidebarManage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';

  const [schools, setSchools] = useState<SchoolBrief[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      try {
        const { data } = await api.get('/schools');
        setSchools(data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load organizations');
      } finally {
        setSchoolsLoading(false);
      }
    })();
  }, [isSuperAdmin]);

  const fetchItems = useCallback(async (schoolId: string) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.get('/sidebar-settings', { params: { school: schoolId, portal: 'admin' } });
      setItems(data.data?.items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sidebar settings');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectSchool = (schoolId: string) => {
    setSelectedSchool(schoolId);
    setMessage('');
    if (schoolId) fetchItems(schoolId);
    else setItems([]);
  };

  const toggleItem = (key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, visible: !i.visible } : i)));
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/sidebar-settings', {
        school: selectedSchool,
        portal: 'admin',
        items: items.map((i) => ({ key: i.key, visible: i.visible })),
      });
      setMessage('✅ Saved — this org\'s admin/teacher sidebar is updated.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save sidebar settings');
    } finally {
      setSaving(false);
    }
  };

  const grouped = items.reduce<Record<string, SidebarItem[]>>((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {});

  if (!isSuperAdmin) {
    return (
      <div className="p-6 lg:p-10 pt-20 lg:pt-10">
        <div className="mx-auto max-w-xl text-center py-16">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Super Admin Only</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
            Only a super admin can configure what other organizations' admin/teacher staff see in their sidebar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 pt-20 lg:pt-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">🗝️ Org Admin Sidebar Manager</h1>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Show or hide items in an organization's admin/teacher sidebar</p>
          </div>
          {selectedSchool && items.length > 0 && (
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 shadow-sm transition-colors">
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-5 shadow-card">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Organization *</label>
          {schoolsLoading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading organizations...</p>
          ) : (
            <select
              value={selectedSchool}
              onChange={(e) => handleSelectSchool(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2.5 text-sm"
            >
              <option value="">Select an organization...</option>
              {schools.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
          <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
            This controls what the org's <strong>org_admin and teacher</strong> accounts see in their own Admin Portal sidebar —
            it never affects students, and org_admin cannot change this themselves.
          </p>
        </div>

        {message && <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600">{error}</div>}

        {loading && <div className="flex justify-center py-10"><div className="h-10 w-10 animate-spin rounded-full border-3 border-[var(--color-border-default)] border-t-primary-600" /></div>}

        {!loading && !selectedSchool && (
          <div className="text-center py-16 text-[var(--color-text-tertiary)]"><p className="text-lg">👆 Select an organization above to manage its admin sidebar</p></div>
        )}

        {!loading && items.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] overflow-hidden shadow-card">
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {Object.entries(grouped).map(([section, sectionItems]) => (
                <div key={section} className="px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">{section}</p>
                  <div className="space-y-1">
                    {sectionItems.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-[var(--color-surface-secondary)] transition-colors">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.key)}
                          role="switch"
                          aria-checked={item.visible}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${item.visible ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${item.visible ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrgAdminSidebarManage;
