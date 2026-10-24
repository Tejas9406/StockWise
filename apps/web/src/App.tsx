import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Landing from './pages/Landing';
import LoginPlaceholder from './pages/LoginPlaceholder';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Planner from './pages/Planner';
import DisruptionLab from './pages/DisruptionLab';
import Recovery from './pages/Recovery';
import Compare from './pages/Compare';
import Exports from './pages/Exports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page is full-bleed: it sits outside the console shell */}
        <Route path="/" element={<Landing />} />

        {/* Placeholder until the team's Firebase auth module lands (see the file header) */}
        <Route path="/login" element={<LoginPlaceholder />} />

        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/datasets" element={<Datasets />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/disruption" element={<DisruptionLab />} />
                <Route path="/recovery" element={<Recovery />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/exports" element={<Exports />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
