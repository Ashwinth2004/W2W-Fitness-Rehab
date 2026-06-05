import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="text-7xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-slate-600">The page you’re looking for doesn’t exist or has moved.</p>
        <Link to="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </div>
  )
}
