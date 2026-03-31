'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STOCKS_PER_PAGE = 20;

export default function AdminStocksClient() {
  const { getSessionToken } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_stocks: 0, last_updated: null });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: STOCKS_PER_PAGE,
    offset: 0,
    currentPage: 1
  });

  const [editDialog, setEditDialog] = useState({
    open: false,
    symbol: '',
    country: '',
    sector_key: '',
    industry_key: '',
    exchange: '',
    currency: ''
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    symbol: '',
    stockName: ''
  });

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch stocks when page changes
  useEffect(() => {
    fetchStocks();
  }, [pagination.currentPage]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stocks/stats`, {
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const offset = (pagination.currentPage - 1) * STOCKS_PER_PAGE;

      const response = await fetch(
        `${API_BASE_URL}/api/admin/stocks?limit=${STOCKS_PER_PAGE}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${getSessionToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stocks');
      }

      const data = await response.json();
      if (data.success) {
        setStocks(data.stocks);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          offset: data.pagination.offset
        }));
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
      toast.error('Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditClick = (stock) => {
    setEditDialog({
      open: true,
      symbol: stock.symbol,
      country: stock.country || '',
      sector_key: stock.sector_key || '',
      industry_key: stock.industry_key || '',
      exchange: stock.exchange || '',
      currency: stock.currency || ''
    });
  };

  const confirmEdit = async () => {
    const { symbol, country, sector_key, industry_key, exchange, currency } = editDialog;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stocks/${symbol}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`,
        },
        body: JSON.stringify({
          country: country || null,
          sector_key: sector_key || null,
          industry_key: industry_key || null,
          exchange: exchange || null,
          currency: currency || null
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update stock');
      }

      const data = await response.json();

      if (data.success) {
        setStocks(stocks.map(s =>
          s.symbol === symbol ? { ...s, ...data.stock } : s
        ));
        toast.success('Stock updated successfully');
        setEditDialog({
          open: false,
          symbol: '',
          country: '',
          sector_key: '',
          industry_key: '',
          exchange: '',
          currency: ''
        });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(error.message || 'Failed to update stock');
    }
  };

  const handleDeleteClick = (stock) => {
    setDeleteDialog({
      open: true,
      symbol: stock.symbol,
      stockName: stock.symbol
    });
  };

  const confirmDelete = async () => {
    const { symbol } = deleteDialog;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stocks/${symbol}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete stock');
      }

      const data = await response.json();

      if (data.success) {
        setStocks(stocks.filter(s => s.symbol !== symbol));
        toast.success('Stock deleted successfully');
        setDeleteDialog({
          open: false,
          symbol: '',
          stockName: ''
        });
        // Refresh stats and page if needed
        fetchStats();
        if (stocks.length === 1 && pagination.currentPage > 1) {
          handlePageChange(pagination.currentPage - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      toast.error(error.message || 'Failed to delete stock');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(pagination.total / STOCKS_PER_PAGE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6 px-4 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="min-w-[80px]"
        >
          Previous
        </Button>

        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              className="min-w-[40px]"
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {pages.map(page => (
          <Button
            key={page}
            variant={page === pagination.currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
            className="min-w-[40px]"
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              className="min-w-[40px]"
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === totalPages}
          className="min-w-[80px]"
        >
          Next
        </Button>
      </div>
    );
  };

  if (loading && stocks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading stocks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 serif mb-2">
          Stocks Management
        </h1>
        <p className="text-gray-600 text-lg">
          Manage stocks database and information
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
          <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
            Total Stocks
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.total_stocks.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
          <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
            Last Updated
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatDate(stats.last_updated)}
          </div>
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-white shadow-lg">
        <div className="px-4 py-2">
          <h2 className="text-xl font-bold text-gray-900 serif">
            Stocks List ({pagination.total} total)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Market Cap</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : stocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-gray-600">No stocks found</p>
                  </TableCell>
                </TableRow>
              ) : (
                stocks.map((stock) => (
                  <TableRow key={stock.symbol}>
                    <TableCell className="font-semibold font-mono">
                      {stock.symbol}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stock.country || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stock.exchange || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stock.currency || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stock.market_cap ? (
                        `$${(stock.market_cap / 1e9).toFixed(2)}B`
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stock.sector_key || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(stock.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(stock)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(stock)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && stocks.length > 0 && renderPagination()}
      </div>

      {/* Edit Stock Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({
            open: false,
            symbol: '',
            country: '',
            sector_key: '',
            industry_key: '',
            exchange: '',
            currency: ''
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4">
            <DialogTitle className="text-2xl font-bold">Edit Stock</DialogTitle>
            <DialogDescription className="text-base">
              Update stock information. Symbol cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            {/* Symbol (readonly) */}
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Symbol (Read-only)
              </label>
              <input
                type="text"
                value={editDialog.symbol}
                disabled
                className="border-2 border-gray-300 bg-gray-100 px-4 py-3 text-gray-600 rounded font-mono text-sm"
              />
            </div>

            {/* Country */}
            <div className="grid gap-3">
              <label htmlFor="country" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={editDialog.country}
                onChange={(e) => setEditDialog({ ...editDialog, country: e.target.value })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                placeholder="e.g., United States, Germany"
              />
            </div>

            {/* Sector */}
            <div className="grid gap-3">
              <label htmlFor="sector_key" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Sector
              </label>
              <input
                id="sector_key"
                type="text"
                value={editDialog.sector_key}
                onChange={(e) => setEditDialog({ ...editDialog, sector_key: e.target.value })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                placeholder="e.g., Technology, Healthcare"
              />
            </div>

            {/* Industry */}
            <div className="grid gap-3">
              <label htmlFor="industry_key" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Industry
              </label>
              <input
                id="industry_key"
                type="text"
                value={editDialog.industry_key}
                onChange={(e) => setEditDialog({ ...editDialog, industry_key: e.target.value })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                placeholder="e.g., Software, Pharmaceuticals"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Exchange */}
              <div className="grid gap-3">
                <label htmlFor="exchange" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Exchange
                </label>
                <input
                  id="exchange"
                  type="text"
                  value={editDialog.exchange}
                  onChange={(e) => setEditDialog({ ...editDialog, exchange: e.target.value })}
                  className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                  placeholder="e.g., NASDAQ, NYSE"
                />
              </div>

              {/* Currency */}
              <div className="grid gap-3">
                <label htmlFor="currency" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Currency
                </label>
                <input
                  id="currency"
                  type="text"
                  value={editDialog.currency}
                  onChange={(e) => setEditDialog({ ...editDialog, currency: e.target.value })}
                  className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                  placeholder="e.g., USD, EUR"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setEditDialog({
                open: false,
                symbol: '',
                country: '',
                sector_key: '',
                industry_key: '',
                exchange: '',
                currency: ''
              })}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEdit}
              className="min-w-[140px]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stock Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, symbol: '', stockName: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stock</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{deleteDialog.stockName}</strong>?
              </p>
              <p className="text-red-600 font-semibold">
                This action cannot be undone. All stock data, price history, and related information will be permanently deleted.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, symbol: '', stockName: '' })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
