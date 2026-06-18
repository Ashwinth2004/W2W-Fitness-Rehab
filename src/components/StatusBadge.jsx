const styles = {
  confirmed: 'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
  new: 'bg-red-100 text-red-600',
  read: 'bg-slate-100 text-slate-500',
}

const labels = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  new: 'NEW',
  read: 'Read',
}

export default function StatusBadge({ status }) {
  return <span className={`badge ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{labels[status] || status}</span>
}
