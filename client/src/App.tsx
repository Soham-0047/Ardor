import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Tournament from './pages/Tournament';
import Personal from './pages/Personal';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="explore" element={<Explore />} />
        <Route path="tournament" element={<Tournament />} />
        <Route path="personal" element={<Personal />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
