import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storeService } from '../../services/storeService';
import { inventoryService } from '../../services/inventoryService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const SalesHistory = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Record Sale Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    productId: '',
    quantity: 5,
    date: new Date().toISOString().split('T')[0],
  });
  const [submittingSale, setSubmittingSale] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, prodRes] = await Promise.all([
        storeService.getSalesHistory(),
        inventoryService.getAllProducts(),
      ]);

      if (salesRes.success) setSales(salesRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!saleForm.productId) {
      setToast({ show: true, message: 'Please select a product', type: 'error' });
      return;
    }
    if (Number(saleForm.quantity) <= 0) {
      setToast({ show: true, message: 'Quantity must be at least 1', type: 'error' });
      return;
    }
    setSubmittingSale(true);
    try {
      const storeId = user?.storeId?.id || user?.storeId?._id || user?.storeId || 1;
      const res = await storeService.recordSale({
        storeId,
        productId: parseInt(saleForm.productId, 10),
        quantity: Number(saleForm.quantity),
        date: saleForm.date,
      });

      if (res.success) {
        setIsRecordModalOpen(false);
        setToast({
          show: true,
          message: res.message || 'Sale transaction recorded! Store inventory decremented.',
          type: 'success',
        });
        await fetchData();
      }
    } catch (err) {
      setToast({
        show: true,
        message: err.response?.data?.message || err.message || 'Failed to record sale',
        type: 'error',
      });
    } finally {
      setSubmittingSale(false);
    }
  };

  // Prepare chart data aggregating sales by product
  const productAggMap = {};
  sales.forEach((s) => {
    const name = s.productId?.name || 'Item';
    if (!productAggMap[name]) productAggMap[name] = 0;
    productAggMap[name] += s.quantity;
  });

  const chartData = Object.keys(productAggMap).map((k) => ({
    name: k.length > 15 ? k.substring(0, 15) + '...' : k,
    Units: productAggMap[k],
  }));

  if (loading) return <LoadingSpinner text="Retrieving retail sales history..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Sales History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical point-of-sale transactions feeding the Phase 2 demand forecasting algorithms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchData}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setSaleForm({
                productId: products[0]?._id || '',
                quantity: 5,
                date: new Date().toISOString().split('T')[0],
              });
              setIsRecordModalOpen(true);
            }}
          >
            Record Sale Transaction
          </Button>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <Card title="Sales Volume Breakdown by Product" subtitle="Total customer units sold">
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Units" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Sales Transactions Table */}
      <Card noPadding title="Transaction Log">
        {sales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No sales transactions recorded yet"
            description="Use 'Record Sale Transaction' to log customer purchases."
            actionText="Record First Sale"
            onAction={() => setIsRecordModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transaction Date</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Quantity Sold</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {new Date(s.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{s.productId?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {s.productId?.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <Badge variant="gray">{s.productId?.category}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      ${s.productId?.sellingPrice || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      {s.quantity} units
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${s.revenue ? s.revenue.toLocaleString() : (s.quantity * (s.productId?.sellingPrice || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Sale Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Point-of-Sale Purchase"
        subtitle="Deducts store inventory and records sales telemetry for forecasting"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingSale}
              onClick={handleRecordSale}
            >
              Confirm Sale & Deduct Stock
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordSale} className="space-y-4">
          <Select
            label="Product Sold"
            required
            value={saleForm.productId}
            onChange={(e) => setSaleForm({ ...saleForm, productId: e.target.value })}
            options={products.map((p) => ({
              value: p._id,
              label: `${p.name} ($${p.sellingPrice || 0})`,
            }))}
          />

          <Input
            label="Quantity Sold"
            type="number"
            required
            min="1"
            value={saleForm.quantity}
            onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
          />

          <Input
            label="Sale Date"
            type="date"
            required
            value={saleForm.date}
            onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
