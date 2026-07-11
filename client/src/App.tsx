import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Tournament from './pages/Tournament';
import Personal from './pages/Personal';

export default function App() {
  return (
    <Routes>
      {/* Marketing/landing page with its own chrome. */}
      <Route path="/" element={<Landing />} />

      {/* The product lives under /app. */}
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="explore" element={<Explore />} />
        <Route path="tournament" element={<Tournament />} />
        <Route path="personal" element={<Personal />} />
      </Route>

      {/* Legacy paths from before the landing page existed. */}
      <Route path="/explore" element={<Navigate to="/app/explore" replace />} />
      <Route path="/tournament" element={<Navigate to="/app/tournament" replace />} />
      <Route path="/personal" element={<Navigate to="/app/personal" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
