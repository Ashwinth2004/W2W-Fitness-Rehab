const styles = {
  confirmed: 'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
  new: 'bg-amber-50 text-amber-700',
  read: 'bg-slate-100 text-slate-500',
}

const labels = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  new: 'New',
  read: 'Read',
}

export default function StatusBadge({ status }) {
  return <span className={`badge ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{labels[status] || status}</span>
}
