// Sticky page header for admin modules — the title (and any right-side action
// like Add / Close) stays pinned at the top while the page content scrolls.
// The negative margins make it span the full width of the padded <main>.
export default function AdminPageHeader({ title, subtitle, children }) {
  return (
    <div className="sticky top-16 z-30 -mx-4 -mt-4 mb-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mt-6 md:justify-start md:px-6 lg:-mx-8 lg:-mt-8 lg:top-0 lg:px-8 lg:py-4">
      {/* Action(s) on the LEFT of the title for quick access (e.g. Close). */}
      {children && <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">{children}</div>}
      <div className="min-w-0 text-center md:text-left">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}
