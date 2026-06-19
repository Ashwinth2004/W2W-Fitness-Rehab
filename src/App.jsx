import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FloatingButtons from './components/FloatingButtons'
import BookingModal from './components/BookingModal'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import ConfigGuard from './components/ConfigGuard'
import AnnouncementBar from './components/AnnouncementBar'
import WorkshopPopup from './components/WorkshopPopup'

// Public pages
import Home from './pages/Home'
import Services from './pages/Services'
import About from './pages/About'
import Contact from './pages/Contact'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Gallery from './pages/Gallery'
import Testimonials from './pages/Testimonials'
import Workshop from './pages/Workshop'
import NotFound from './pages/NotFound'

// Admin (lazy — keeps the public bundle small)
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Queries = lazy(() => import('./pages/admin/Queries'))
const Appointments = lazy(() => import('./pages/admin/Appointments'))
const Clients = lazy(() => import('./pages/admin/Clients'))
const ClientDetail = lazy(() => import('./pages/admin/ClientDetail'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const Accounting = lazy(() => import('./pages/admin/Accounting'))
const Content = lazy(() => import('./pages/admin/Content'))
const Workshops = lazy(() => import('./pages/admin/Workshops'))

function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingButtons />
      <BookingModal />
      <WorkshopPopup />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      <ScrollToTop />
      <ConfigGuard />
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-brand-600">Loading…</div>}>
        {isAdmin ? (
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="queries" element={<Queries />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="reports" element={<Reports />} />
              <Route path="accounting" element={<Accounting />} />
              <Route path="content" element={<Content />} />
              <Route path="workshops" element={<Workshops />} />
            </Route>
          </Routes>
        ) : (
          <PublicLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/testimonials" element={<Testimonials />} />
              <Route path="/workshop" element={<Workshop />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PublicLayout>
        )}
      </Suspense>
    </>
  )
}
