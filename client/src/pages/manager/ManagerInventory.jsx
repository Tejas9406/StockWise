import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Search, Plus, Filter, Boxes, RefreshCw } from 'lucide-react';

export const ManagerInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedLocationType, setSelectedLocationType] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal State for adding/updating inventory
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    productId: '',
    locationType: 'WAREHOUSE',
    warehouseId: '',
    storeId: '',
    quantity: 100,
    reservedQuantity: 0,
  });
  const [savingStock, setSavingStock] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, whRes, stRes, prRes] = await Promise.all([
        inventoryService.getAllInventory(),
        inventoryService.getAllWarehouses(),
        inventoryService.getAllStores(),
        inventoryService.getAllProducts(),
      ]);

      if (invRes.success) setInventories(invRes.data);
      if (whRes.success) setWarehouses(whRes.data);
      if (stRes.success) setStores(stRes.data);
      if (prRes.success) setProducts(prRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load master inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveStock = async (e) => {
    e.preventDefault();
    setSavingStock(true);
    try {
      await inventoryService.upsertInventory({
        productId: modalForm.productId,
        locationType: modalForm.locationType,
        warehouseId: modalForm.locationType === 'WAREHOUSE' ? modalForm.warehouseId : null,
        storeId: modalForm.locationType === 'STORE' ? modalForm.storeId : null,
        quantity: Number(modalForm.quantity),
        reservedQuantity: Number(modalForm.reservedQuantity || 0),
      });
      setIsAddModalOpen(false);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  // Filter logic
  const filteredInventories = inventories.filter((item) => {
    if (!item.productId) return false;

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      const nameMatch = item.productId.name?.toLowerCase().includes(term);
      const skuMatch = item.productId.sku?.toLowerCase().includes(term);
      const locMatch =
        item.warehouseId?.name?.toLowerCase().includes(term) ||
        item.storeId?.name?.toLowerCase().includes(term) ||
        item.warehouseId?.code?.toLowerCase().includes(term) ||
        item.storeId?.code?.toLowerCase().includes(term);

      if (!nameMatch && !skuMatch && !locMatch) return false;
    }

    // Location Type filter
    if (selectedLocationType && item.locationType !== selectedLocationType) {
      return false;
    }

    // Location Id filter
    if (selectedLocationId) {
      const matchWh = item.warehouseId?._id === selectedLocationId;
      const matchSt = item.storeId?._id === selectedLocationId;
      if (!matchWh && !matchSt) return false;
    }

    // Category filter
    if (selectedCategory && item.productId.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  if (loading) return <LoadingSpinner text="Retrieving network inventory records..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Network Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of on-hand and reserved FMCG stock across warehouses and stores
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
              setModalForm({
                productId: products[0]?._id || '',
                locationType: 'WAREHOUSE',
                warehouseId: warehouses[0]?._id || '',
                storeId: stores[0]?._id || '',
                quantity: 100,
                reservedQuantity: 0,
              });
              setIsAddModalOpen(true);
            }}
          >
            Adjust / Add Stock
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card noPadding className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, SKU, facility..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 text-xs text-slate-800 pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedLocationType}
            onChange={(e) => {
              setSelectedLocationType(e.target.value);
              setSelectedLocationId('');
            }}
            className="bg-slate-50 text-xs text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Location Types</option>
            <option value="WAREHOUSE">Warehouses Only</option>
            <option value="STORE">Retail Stores Only</option>
          </select>

          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="bg-slate-50 text-xs text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Facilities</option>
            {(!selectedLocationType || selectedLocationType === 'WAREHOUSE') &&
              warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  Warehouse: {wh.code} - {wh.name}
                </option>
              ))}
            {(!selectedLocationType || selectedLocationType === 'STORE') &&
              stores.map((st) => (
                <option key={st._id} value={st._id}>
                  Store: {st.code} - {st.name}
                </option>
              ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 text-xs text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card noPadding>
        {filteredInventories.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory records found"
            description="No inventory records match your selected search and filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearch('');
              setSelectedLocationType('');
              setSelectedLocationId('');
              setSelectedCategory('');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Facility / Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Physical Stock</th>
                  <th className="py-3 px-4 text-right">Reserved</th>
                  <th className="py-3 px-4 text-right">Available</th>
                  <th className="py-3 px-4 text-center">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventories.map((inv) => {
                  const available = inv.availableQuantity;
                  const safety = inv.productId?.minSafetyStock || 20;

                  let healthBadge = <Badge variant="emerald" dot>Normal</Badge>;
                  if (available === 0) {
                    healthBadge = <Badge variant="rose" dot>Stockout</Badge>;
                  } else if (available <= safety) {
                    healthBadge = <Badge variant="amber" dot>Low Stock</Badge>;
                  }

                  const locationObj = inv.warehouseId || inv.storeId;

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.productId?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SKU: {inv.productId?.sku} • {inv.productId?.unit}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              inv.locationType === 'WAREHOUSE' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                          />
                          <span>{locationObj?.name || 'Unknown'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {inv.locationType} • {locationObj?.code}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <Badge variant="gray">{inv.productId?.category}</Badge>
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {inv.quantity.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-amber-600">
                        {inv.reservedQuantity ? inv.reservedQuantity.toLocaleString() : '0'}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {available.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center">{healthBadge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Adjust / Add Stock Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adjust Facility Stock"
        subtitle="Update inventory balance for any FMCG product in warehouse or store"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={savingStock} onClick={handleSaveStock}>
              Save Stock Update
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveStock} className="space-y-4">
          <Select
            label="Product"
            required
            value={modalForm.productId}
            onChange={(e) => setModalForm({ ...modalForm, productId: e.target.value })}
            options={products.map((p) => ({
              value: p._id,
              label: `${p.name} (${p.sku})`,
            }))}
          />

          <Select
            label="Facility Type"
            required
            value={modalForm.locationType}
            onChange={(e) =>
              setModalForm({
                ...modalForm,
                locationType: e.target.value,
              })
            }
            options={[
              { value: 'WAREHOUSE', label: 'Warehouse Hub' },
              { value: 'STORE', label: 'Retail Store' },
            ]}
          />

          {modalForm.locationType === 'WAREHOUSE' ? (
            <Select
              label="Select Warehouse"
              required
              value={modalForm.warehouseId}
              onChange={(e) => setModalForm({ ...modalForm, warehouseId: e.target.value })}
              options={warehouses.map((wh) => ({
                value: wh._id,
                label: `${wh.code} — ${wh.name}`,
              }))}
            />
          ) : (
            <Select
              label="Select Store"
              required
              value={modalForm.storeId}
              onChange={(e) => setModalForm({ ...modalForm, storeId: e.target.value })}
              options={stores.map((st) => ({
                value: st._id,
                label: `${st.code} — ${st.name}`,
              }))}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Physical Stock"
              type="number"
              required
              min="0"
              value={modalForm.quantity}
              onChange={(e) => setModalForm({ ...modalForm, quantity: e.target.value })}
            />
            <Input
              label="Reserved Stock"
              type="number"
              min="0"
              value={modalForm.reservedQuantity}
              onChange={(e) => setModalForm({ ...modalForm, reservedQuantity: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
