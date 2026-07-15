import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { Attendance } from './pages/Attendance'
import { AuthCallback } from './pages/AuthCallback'
import { Calendar } from './pages/Calendar'
import { CampaignDetail } from './pages/CampaignDetail'
import { Campaigns } from './pages/Campaigns'
import { GameDayDetail } from './pages/GameDayDetail'
import { GameDays } from './pages/GameDays'
import { Games } from './pages/Games'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { Settings } from './pages/Settings'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth" element={<AuthCallback />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Overview />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/games" element={<Games />} />
        <Route path="/game-days" element={<GameDays />} />
        <Route path="/game-days/:id" element={<GameDayDetail />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
