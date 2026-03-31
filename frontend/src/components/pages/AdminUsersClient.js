'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UsersManagement() {
  const t = useTranslations('admin');
  const { user: currentUser, getSessionToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    userId: null,
    newValue: false,
    userName: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    userName: '',
    userEmail: ''
  });
  const [editDialog, setEditDialog] = useState({
    open: false,
    userId: null,
    firstName: '',
    lastName: '',
    email: '',
    role: 'USER',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAiToggleClick = (user) => {
    setConfirmDialog({
      open: true,
      userId: user.id,
      newValue: !user.ai_enabled,
      userName: `${user.first_name} ${user.last_name}`
    });
  };

  const confirmAiToggle = async () => {
    const { userId, newValue } = confirmDialog;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/ai-enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`,
        },
        body: JSON.stringify({
          ai_enabled: newValue
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update AI access');
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setUsers(users.map(u =>
          u.id === userId ? { ...u, ai_enabled: newValue } : u
        ));

        toast.success(newValue ? 'AI access enabled successfully' : 'AI access disabled successfully');
      }
    } catch (error) {
      console.error('Error updating AI access:', error);
      toast.error('Failed to update AI access');
    } finally {
      setConfirmDialog({
        open: false,
        userId: null,
        newValue: false,
        userName: ''
      });
    }
  };

  const handleDeleteClick = (userToDelete) => {
    // Prevent deleting own account
    if (currentUser && currentUser.id === userToDelete.id) {
      toast.error('Cannot delete your own account');
      return;
    }

    setDeleteDialog({
      open: true,
      userId: userToDelete.id,
      userName: `${userToDelete.first_name} ${userToDelete.last_name}`,
      userEmail: userToDelete.email
    });
  };

  const confirmDelete = async () => {
    const { userId } = deleteDialog;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete user');
      }

      const data = await response.json();

      if (data.success) {
        // Remove user from local state
        setUsers(users.filter(u => u.id !== userId));
        toast.success('User deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleteDialog({
        open: false,
        userId: null,
        userName: '',
        userEmail: ''
      });
    }
  };

  const handleEditClick = (user) => {
    setEditDialog({
      open: true,
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    });
  };

  const confirmEdit = async () => {
    const { userId, firstName, lastName, email, role, isActive } = editDialog;

    // Validate required fields
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          role: role,
          is_active: isActive
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update user');
      }

      const data = await response.json();

      if (data.success) {
        // Update local state with the updated user
        setUsers(users.map(u =>
          u.id === userId ? { ...u, ...data.user } : u
        ));
        toast.success('User updated successfully');
        setEditDialog({
          open: false,
          userId: null,
          firstName: '',
          lastName: '',
          email: '',
          role: 'USER',
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') {
      return <Badge variant="destructive">ADMIN</Badge>;
    }
    return <Badge variant="secondary">USER</Badge>;
  };

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return <Badge variant="success">ACTIVE</Badge>;
    }
    return <Badge variant="outline">INACTIVE</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading users...</p>
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
            User Management
          </h1>
          <p className="text-gray-600 text-lg">
            Manage user accounts and permissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              Total Users
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {users.length}
            </div>
          </div>
          <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              Active Users
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {users.filter(u => u.is_active).length}
            </div>
          </div>
          <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              AI Enabled
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {users.filter(u => u.ai_enabled).length}
            </div>
          </div>
          <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
              Administrators
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {users.filter(u => u.role === 'ADMIN').length}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow-lg">
          <div className=" px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900 serif">
              All Users ({users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead className="text-center">AI Access</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-gray-600">No users found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-semibold">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.is_active)}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={user.ai_enabled}
                            onCheckedChange={() => handleAiToggleClick(user)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            disabled={currentUser && user.id === currentUser.id}
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
        </div>
      </div>

      {/* AI Access Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({ open: false, userId: null, newValue: false, userName: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm AI Access Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.newValue ? 'enable' : 'disable'} AI access for{' '}
              <strong>{confirmDialog.userName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, userId: null, newValue: false, userName: '' })}
            >
              Cancel
            </Button>
            <Button onClick={confirmAiToggle}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, userId: null, userName: '', userEmail: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{deleteDialog.userName}</strong>{' '}
                ({deleteDialog.userEmail})?
              </p>
              <p className="text-red-600 font-semibold">
                This action cannot be undone. All user data, sessions, and conversations will be permanently deleted.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, userId: null, userName: '', userEmail: '' })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({
            open: false,
            userId: null,
            firstName: '',
            lastName: '',
            email: '',
            role: 'USER',
            isActive: true
          });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* First Name */}
            <div className="grid gap-2">
              <label htmlFor="firstName" className="text-sm font-semibold text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={editDialog.firstName}
                onChange={(e) => setEditDialog({ ...editDialog, firstName: e.target.value })}
                className="border-2 border-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div className="grid gap-2">
              <label htmlFor="lastName" className="text-sm font-semibold text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={editDialog.lastName}
                onChange={(e) => setEditDialog({ ...editDialog, lastName: e.target.value })}
                className="border-2 border-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="Enter last name"
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={editDialog.email}
                onChange={(e) => setEditDialog({ ...editDialog, email: e.target.value })}
                className="border-2 border-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="Enter email address"
              />
            </div>

            {/* Role */}
            <div className="grid gap-2">
              <label htmlFor="role" className="text-sm font-semibold text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={editDialog.role}
                onChange={(e) => setEditDialog({ ...editDialog, role: e.target.value })}
                className="border-2 border-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white"
                disabled={currentUser && editDialog.userId === currentUser.id}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              {currentUser && editDialog.userId === currentUser.id && (
                <p className="text-sm text-gray-600">
                  You cannot change your own role
                </p>
              )}
            </div>

            {/* Active Status */}
            <div className="grid gap-2">
              <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                Account Status
              </label>
              <div className="flex items-center space-x-3">
                <Switch
                  id="isActive"
                  checked={editDialog.isActive}
                  onCheckedChange={(checked) => setEditDialog({ ...editDialog, isActive: checked })}
                />
                <span className="text-sm text-gray-700">
                  {editDialog.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({
                open: false,
                userId: null,
                firstName: '',
                lastName: '',
                email: '',
                role: 'USER',
                isActive: true
              })}
            >
              Cancel
            </Button>
            <Button onClick={confirmEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

