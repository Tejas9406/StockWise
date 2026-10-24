import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/inventoryService';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { User, Mail, Lock, Shield } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DISTRIBUTION_MANAGER');
  const [warehouseId, setWarehouseId] = useState('');
  const [storeId, setStoreId] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const [whRes, stRes] = await Promise.all([
          inventoryService.getAllWarehouses(),
          inventoryService.getAllStores(),
        ]);
        if (whRes.success) setWarehouses(whRes.data);
        if (stRes.success) setStores(stRes.data);
      } catch (err) {
        console.error('Failed to load locations for registration:', err);
      }
    };
    loadLocations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (role === 'WAREHOUSE' && !warehouseId) {
      setError('Please select an assigned warehouse.');
      return;
    }
    if (role === 'STORE_MANAGER' && !storeId) {
      setError('Please select an assigned retail store.');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name,
        email,
        password,
        role,
        warehouseId: role === 'WAREHOUSE' ? warehouseId : null,
        storeId: role === 'STORE_MANAGER' ? storeId : null,
      });

      if (user.role === 'DISTRIBUTION_MANAGER') navigate('/manager');
      else if (user.role === 'WAREHOUSE') navigate('/warehouse');
      else if (user.role === 'STORE_MANAGER') navigate('/store');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-6 sm:px-10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <img src="/logo.svg" alt="StockWise AI" className="w-10 h-10 rounded-xl shadow-sm" />
          <span className="text-xl font-bold tracking-tight text-slate-900">StockWise</span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            AI
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-xs text-slate-500 mt-1">Join the StockWise AI distribution network</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="Full Name"
              required
              placeholder="e.g. John Doe"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              id="email"
              label="Email Address"
              type="email"
              required
              placeholder="e.g. user@stockwise.ai"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              required
              placeholder="Choose a secure password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Select
              id="role"
              label="Assigned System Role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'DISTRIBUTION_MANAGER', label: 'Distribution Manager (Central HQ)' },
                { value: 'WAREHOUSE', label: 'Warehouse Staff (Regional Hub)' },
                { value: 'STORE_MANAGER', label: 'Store Manager (Retail Outlet)' },
              ]}
            />

            {role === 'WAREHOUSE' && (
              <Select
                id="warehouseId"
                label="Assign to Warehouse"
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={warehouses.map((wh) => ({
                  value: wh._id,
                  label: `${wh.code} — ${wh.name} (${wh.location})`,
                }))}
              />
            )}

            {role === 'STORE_MANAGER' && (
              <Select
                id="storeId"
                label="Assign to Retail Store"
                required
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                options={stores.map((st) => ({
                  value: st._id,
                  label: `${st.code} — ${st.name} (${st.location})`,
                }))}
              />
            )}

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
