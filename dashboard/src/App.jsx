import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import NewCommitment from './pages/NewCommitment'
import Engagements from './pages/Engagements'
import HowItWorks from './pages/HowItWorks'
import Verification from './pages/Verification'
import MobileVerify from './pages/MobileVerify'
import Habits from './pages/Habits'
import HabitTemplates from './pages/HabitTemplates'
import HabitManager from './pages/HabitManager'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/mobile-verify" element={<MobileVerify />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
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
      </Route>
    </Routes>
  )
}
