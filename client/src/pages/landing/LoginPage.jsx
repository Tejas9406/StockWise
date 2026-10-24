import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Building2, Store } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectByRole = (role) => {
    if (role === 'DISTRIBUTION_MANAGER') navigate('/manager');
    else if (role === 'WAREHOUSE') navigate('/warehouse');
    else if (role === 'STORE_MANAGER') navigate('/store');
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastLogin = async (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
    setLoading(true);
    try {
      const user = await login(roleEmail, rolePass);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
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
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
        <p className="text-xs text-slate-500 mt-1">Enterprise FMCG Distribution & Optimization Platform</p>
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
              id="email"
              label="Email Address"
              type="email"
              required
              placeholder="e.g. manager@stockwise.ai"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="relative">
              <Input
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => alert('For hackathon demonstration, use the demo credentials below or contact admin.')}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Fast Demo Autofill Credentials
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleFastLogin('manager@stockwise.ai', 'password123')}
                disabled={loading}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-all text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Distribution Manager</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">manager@stockwise.ai (Click to Login)</span>
              </button>

              <button
                type="button"
                onClick={() => handleFastLogin('warehouse1@stockwise.ai', 'password123')}
                disabled={loading}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">Warehouse Staff (WH-001)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">warehouse1@stockwise.ai (Click to Login)</span>
              </button>

              <button
                type="button"
                onClick={() => handleFastLogin('store1@stockwise.ai', 'password123')}
                disabled={loading}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 text-left transition-all text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-slate-800">Store Manager (STORE-001)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">store1@stockwise.ai (Click to Login)</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need a new account?{' '}
            <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
