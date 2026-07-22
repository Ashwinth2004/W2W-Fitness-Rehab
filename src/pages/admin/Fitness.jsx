import { Activity } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'

// Placeholder for the upcoming Fitness module — the nav link and route are
// real, only the content is a "coming soon" note until it's built out.
export default function Fitness() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <AdminPageHeader title="Fitness" />
      <div className="grid flex-1 place-items-center">
        <div className="card mx-auto w-full max-w-xl p-10 text-center sm:p-14">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-50 text-brand-600"><Activity size={48} /></div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 sm:text-4xl">Currently under development</h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            This module is being built by the <span className="font-semibold text-brand-600">AK Digital Solution</span> development team and isn't live yet. We'll proceed with it soon.
          </p>
        </div>
      </div>
    </div>
  )
}
