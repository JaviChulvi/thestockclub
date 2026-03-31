'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminDataSyncClient() {
  const { getSessionToken } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningTasks, setRunningTasks] = useState({
    update_funds: false,
    load_stocks: false
  });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskLogs, setSelectedTaskLogs] = useState('');

  useEffect(() => {
    fetchTasks();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [selectedTaskId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data-sync/tasks?limit=20`, {
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);

          // Update running tasks status
          const running = {
            update_funds: false,
            load_stocks: false
          };
          data.tasks.forEach(task => {
            if (task.status === 'running') {
              running[task.task_type] = true;
            }
          });
          setRunningTasks(running);

          // Auto-update logs if a task is selected
          if (selectedTaskId) {
            const selectedTask = data.tasks.find(t => t.id === selectedTaskId);
            if (selectedTask && selectedTask.output_log) {
              setSelectedTaskLogs(selectedTask.output_log);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewTaskLogs = (task) => {
    setSelectedTaskId(task.id);
    setSelectedTaskLogs(task.output_log || 'No logs available yet...');
  };

  const closeLogs = () => {
    setSelectedTaskId(null);
    setSelectedTaskLogs('');
  };

  const startTask = async (taskType) => {
    try {
      setRunningTasks(prev => ({ ...prev, [taskType]: true }));

      const response = await fetch(`${API_BASE_URL}/api/data-sync/start/${taskType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
        fetchTasks(); // Refresh task list
      } else {
        throw new Error(data.detail || 'Failed to start task');
      }
    } catch (error) {
      console.error(`Error starting ${taskType}:`, error);
      toast.error(error.message || `Failed to start ${taskType}`);
      setRunningTasks(prev => ({ ...prev, [taskType]: false }));
    }
  };

  const stopTask = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data-sync/stop/${taskId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
        fetchTasks(); // Refresh task list
      } else {
        throw new Error(data.detail || 'Failed to stop task');
      }
    } catch (error) {
      console.error(`Error stopping task ${taskId}:`, error);
      toast.error(error.message || `Failed to stop task`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt) return 'N/A';

    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800 border-gray-300',
      running: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      failed: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${badges[status] || badges.pending}`}>
        {status}
      </span>
    );
  };

  const getTaskLabel = (taskType) => {
    const labels = {
      update_funds: 'Update Funds Data',
      load_stocks: 'Load Stocks from Holdings'
    };
    return labels[taskType] || taskType;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 serif mb-2">
          Data Synchronization
        </h1>
        <p className="text-gray-600 text-lg">
          Trigger and monitor background data loading tasks
        </p>
      </div>

      {/* Task Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Update Funds Task */}
        <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-2 serif">
            Update Funds Historical Data
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Updates historical price data and returns for all funds using yfinance. This process may take several minutes.
          </p>
          <Button
            onClick={() => startTask('update_funds')}
            disabled={runningTasks.update_funds}
            className="w-full"
          >
            {runningTasks.update_funds ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Running...
              </>
            ) : (
              'Start Update Funds'
            )}
          </Button>
        </div>

        {/* Load Stocks Task */}
        <div className="bg-white border-2 border-gray-800 p-4 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-2 serif">
            Load Stocks from Holdings
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Loads stock data and price history for all symbols found in fund holdings. This process may take several minutes.
          </p>
          <Button
            onClick={() => startTask('load_stocks')}
            disabled={runningTasks.load_stocks}
            className="w-full"
          >
            {runningTasks.load_stocks ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Running...
              </>
            ) : (
              'Start Load Stocks'
            )}
          </Button>
        </div>
      </div>

      {/* Task History */}
      <div className="bg-white shadow-lg">
        <div className="px-4 py-2">
          <h2 className="text-xl font-bold text-gray-900 serif">
            Task History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Task Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Process ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-gray-600">No tasks found. Start a task to see it here.</p>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono text-sm">
                      #{task.id}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {getTaskLabel(task.task_type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(task.status)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(task.started_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(task.started_at, task.completed_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {task.process_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {task.status === 'running' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => stopTask(task.id)}
                            className="text-xs"
                          >
                            Stop
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewTaskLogs(task)}
                          className="text-xs"
                        >
                          View Logs
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

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-600 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> These tasks run in the background and may take several minutes to complete. The status will update automatically every 5 seconds. You can safely navigate away from this page while tasks are running.
            </p>
          </div>
        </div>
      </div>

      {/* Logs Viewer */}
      {selectedTaskId && (
        <div className="mt-6 bg-white border-2 border-gray-800 shadow-lg">
          <div className="px-4 py-3 bg-gray-100 border-b-2 border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 serif">
              Task #{selectedTaskId} Logs
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={closeLogs}
            >
              Close
            </Button>
          </div>
          <div className="p-4">
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded overflow-auto max-h-96">
              <pre className="whitespace-pre-wrap">{selectedTaskLogs}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
