import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
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
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/disruption" element={<DisruptionLab />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/exports" element={<Exports />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
