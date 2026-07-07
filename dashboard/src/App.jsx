import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RouteLoader from './components/RouteLoader'
import Home from './pages/Home'
import Login from './pages/Login'

// Chargées à la demande : ces pages ne sont pas nécessaires au premier
// affichage (landing / login), ce qui allège le bundle initial.
const NewCommitment = lazy(() => import('./pages/NewCommitment'))
const Engagements = lazy(() => import('./pages/Engagements'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Verification = lazy(() => import('./pages/Verification'))
const MobileVerify = lazy(() => import('./pages/MobileVerify'))
const Habits = lazy(() => import('./pages/Habits'))
const HabitTemplates = lazy(() => import('./pages/HabitTemplates'))
const HabitManager = lazy(() => import('./pages/HabitManager'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Progress = lazy(() => import('./pages/Progress'))

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/mobile-verify" element={<MobileVerify />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <NewCommitment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engagements"
          element={
            <ProtectedRoute>
              <Engagements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <Verification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/habits"
          element={
            <ProtectedRoute>
              <Habits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/habits/templates"
          element={
            <ProtectedRoute>
              <HabitTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/habits/manage"
          element={
            <ProtectedRoute>
              <HabitManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
    </Suspense>
  )
}
