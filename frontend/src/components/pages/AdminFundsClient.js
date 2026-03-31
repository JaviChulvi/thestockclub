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

const FUNDS_PER_PAGE = 20;

export default function AdminFundsClient() {
  const { getSessionToken } = useAuth();
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_funds: 0, last_updated: null });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: FUNDS_PER_PAGE,
    offset: 0,
    currentPage: 1
  });

  const [editDialog, setEditDialog] = useState({
    open: false,
    isin: '',
    longName: '',
    shortName: '',
    typeDisp: '',
    currency: '',
    region: '',
    categoryId: null
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    isin: '',
    fundName: ''
  });

  // Fetch categories
  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  // Fetch funds when page or category changes
  useEffect(() => {
    fetchFunds();
  }, [pagination.currentPage, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/funds/stats`, {
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

  const fetchFunds = async () => {
    try {
      setLoading(true);
      const offset = (pagination.currentPage - 1) * FUNDS_PER_PAGE;
      const categoryParam = selectedCategory !== null ? `&category_id=${selectedCategory}` : '';

      const response = await fetch(
        `${API_BASE_URL}/api/admin/funds?limit=${FUNDS_PER_PAGE}&offset=${offset}${categoryParam}`,
        {
          headers: {
            'Authorization': `Bearer ${getSessionToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch funds');
      }

      const data = await response.json();
      if (data.success) {
        setFunds(data.funds);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          offset: data.pagination.offset
        }));
      }
    } catch (error) {
      console.error('Error fetching funds:', error);
      toast.error('Failed to load funds');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value === '' ? null : parseInt(e.target.value);
    setSelectedCategory(categoryId);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to page 1
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditClick = (fund) => {
    setEditDialog({
      open: true,
      isin: fund.isin,
      longName: fund.long_name || '',
      shortName: fund.short_name || '',
      typeDisp: fund.type_disp || '',
      currency: fund.currency || '',
      region: fund.region || '',
      categoryId: fund.category_id || null
    });
  };

  const confirmEdit = async () => {
    const { isin, longName, shortName, typeDisp, currency, region, categoryId } = editDialog;

    // Validate required fields
    if (!longName.trim()) {
      toast.error('Long name is required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/funds/${isin}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`,
        },
        body: JSON.stringify({
          long_name: longName,
          short_name: shortName || null,
          type_disp: typeDisp || null,
          currency: currency || null,
          region: region || null,
          category_id: categoryId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update fund');
      }

      const data = await response.json();

      if (data.success) {
        setFunds(funds.map(f =>
          f.isin === isin ? { ...f, ...data.fund } : f
        ));
        toast.success('Fund updated successfully');
        setEditDialog({
          open: false,
          isin: '',
          longName: '',
          shortName: '',
          typeDisp: '',
          currency: '',
          region: '',
          categoryId: null
        });
      }
    } catch (error) {
      console.error('Error updating fund:', error);
      toast.error(error.message || 'Failed to update fund');
    }
  };

  const handleDeleteClick = (fund) => {
    setDeleteDialog({
      open: true,
      isin: fund.isin,
      fundName: fund.long_name || fund.short_name
    });
  };

  const confirmDelete = async () => {
    const { isin } = deleteDialog;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/funds/${isin}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete fund');
      }

      const data = await response.json();

      if (data.success) {
        setFunds(funds.filter(f => f.isin !== isin));
        toast.success('Fund deleted successfully');
        setDeleteDialog({
          open: false,
          isin: '',
          fundName: ''
        });
        // Refresh stats and page if needed
        fetchStats();
        if (funds.length === 1 && pagination.currentPage > 1) {
          handlePageChange(pagination.currentPage - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting fund:', error);
      toast.error(error.message || 'Failed to delete fund');
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

  const totalPages = Math.ceil(pagination.total / FUNDS_PER_PAGE);

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

  if (loading && funds.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading funds...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 serif mb-2">
            Funds Management
          </h1>
          <p className="text-gray-600 text-lg">
            Manage funds database and information
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              Total Funds
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.total_funds.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              Categories
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {categories.length}
            </div>
          </div>
          <div className="bg-white shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              Last Updated
            </div>
            <div className="text-lg font-bold text-gray-900">
              {formatDate(stats.last_updated)}
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white border-2 border-gray-800 p-6 mb-6 shadow-lg">
          <label htmlFor="category-select" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Filter by Category
          </label>
          <select
            id="category-select"
            value={selectedCategory === null ? '' : selectedCategory}
            onChange={handleCategoryChange}
            className="w-full md:w-auto px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.fullname || category.name} ({category.fund_count})
              </option>
            ))}
          </select>
        </div>

        {/* Funds Table */}
        <div className="bg-white shadow-lg">
          <div className="px-4 py-2">
            <h2 className="text-xl font-bold text-gray-900 serif">
              Funds List ({pagination.total} total)
            </h2>
            {selectedCategory !== null && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {funds.length} funds in selected category
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund Name</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>YTD Return</TableHead>
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
                ) : funds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-gray-600">No funds found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  funds.map((fund) => (
                    <TableRow key={fund.isin}>
                      <TableCell className="font-semibold max-w-xs">
                        <div className="truncate" title={fund.long_name}>
                          {fund.long_name || fund.short_name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {fund.isin}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fund.type_disp || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fund.region || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fund.currency || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {fund.ytd_return !== null && fund.ytd_return !== undefined ? (
                          <span className={fund.ytd_return >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {fund.ytd_return >= 0 ? '+' : ''}{fund.ytd_return.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(fund.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(fund)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(fund)}
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
          {!loading && funds.length > 0 && renderPagination()}
        </div>
      </div>

      {/* Edit Fund Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({
            open: false,
            isin: '',
            longName: '',
            shortName: '',
            typeDisp: '',
            currency: '',
            region: '',
            categoryId: null
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4">
            <DialogTitle className="text-2xl font-bold">Edit Fund</DialogTitle>
            <DialogDescription className="text-base">
              Update fund information. ISIN cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            {/* ISIN (readonly) */}
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                ISIN (Read-only)
              </label>
              <input
                type="text"
                value={editDialog.isin}
                disabled
                className="border-2 border-gray-300 bg-gray-100 px-4 py-3 text-gray-600 rounded font-mono text-sm"
              />
            </div>

            {/* Long Name */}
            <div className="grid gap-3">
              <label htmlFor="longName" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Long Name <span className="text-red-600">*</span>
              </label>
              <input
                id="longName"
                type="text"
                value={editDialog.longName}
                onChange={(e) => setEditDialog({ ...editDialog, longName: e.target.value })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                placeholder="Enter full fund name"
              />
            </div>

            {/* Short Name */}
            <div className="grid gap-3">
              <label htmlFor="shortName" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Short Name
              </label>
              <input
                id="shortName"
                type="text"
                value={editDialog.shortName}
                onChange={(e) => setEditDialog({ ...editDialog, shortName: e.target.value })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                placeholder="Enter short name or ticker"
              />
            </div>

            {/* Type */}
            <div className="grid gap-3">
              <label htmlFor="typeDisp" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Type
              </label>
              <input
                id="typeDisp"
                type="text"
                value={editDialog.typeDisp}
                onChange={(e) => setEditDialog({ ...editDialog, typeDisp: e.target.value })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                placeholder="e.g., Fund, ETF"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  placeholder="e.g., EUR, USD"
                />
              </div>

              {/* Region */}
              <div className="grid gap-3">
                <label htmlFor="region" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Region
                </label>
                <input
                  id="region"
                  type="text"
                  value={editDialog.region}
                  onChange={(e) => setEditDialog({ ...editDialog, region: e.target.value })}
                  className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 rounded"
                  placeholder="e.g., US, Europe"
                />
              </div>
            </div>

            {/* Category */}
            <div className="grid gap-3">
              <label htmlFor="categoryId" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Category
              </label>
              <select
                id="categoryId"
                value={editDialog.categoryId || ''}
                onChange={(e) => setEditDialog({ ...editDialog, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                className="border-2 border-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white rounded appearance-none cursor-pointer"
              >
                <option value="">None</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.fullname || category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setEditDialog({
                open: false,
                isin: '',
                longName: '',
                shortName: '',
                typeDisp: '',
                currency: '',
                region: '',
                categoryId: null
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

      {/* Delete Fund Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, isin: '', fundName: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fund</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{deleteDialog.fundName}</strong> ({deleteDialog.isin})?
              </p>
              <p className="text-red-600 font-semibold">
                This action cannot be undone. All fund data, price history, and related information will be permanently deleted.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, isin: '', fundName: '' })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
