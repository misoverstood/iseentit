// ============================================================
// status.js — single source of truth for library statuses
// ============================================================

export const STATUSES = [
  { key: 'watching',       label: 'Watching'      },
  { key: 'completed',      label: 'Completed'     },
  { key: 'plan_to_watch',  label: 'Plan to Watch' },
  { key: 'dropped',        label: 'Dropped'       },
];

export function statusLabel(key) {
  return STATUSES.find(s => s.key === key)?.label ?? key;
}
