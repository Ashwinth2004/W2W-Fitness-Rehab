import { Home, Phone, Globe } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'

// Placeholder for the upcoming Home Visits module — the nav link and route
// are real, only the content is a "coming soon" note until it's built out.
export default function HomeVisits() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <AdminPageHeader title="Home Visits" />
      <div className="grid flex-1 place-items-center">
        <div className="card mx-auto w-full max-w-xl p-10 text-center sm:p-14">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-50 text-brand-600"><Home size={48} /></div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 sm:text-4xl">Currently under development</h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            This module is being built by the <span className="font-semibold text-brand-600">AK Digital Solution</span> development team and isn't live yet. It'll appear here once ready.
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <a href="tel:+917010580526" className="flex items-center gap-2 font-medium hover:text-brand-600"><Phone size={15} /> 7010580526</a>
            <a href="https://www.akdigitalsolution.in" target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium hover:text-brand-600"><Globe size={15} /> www.akdigitalsolution.in</a>
          </div>
        </div>
      </div>
    </div>
  )
}
