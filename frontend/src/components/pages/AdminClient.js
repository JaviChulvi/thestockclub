'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';

export default function AdminDashboard() {
  const t = useTranslations('admin');
  const { user, getSessionToken } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_funds: 0,
    total_chats: 0,
    tokens_used: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(t('message.error', { default: 'Error loading statistics' }));
    } finally {
      setLoading(false);
    }
  };

  // Format numbers with thousands separator
  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  // Dummy recent activities
  const recentActivities = [
    { id: 1, action: 'New user registered', user: 'john.doe@example.com', time: '5 minutes ago', type: 'user' },
    { id: 2, action: 'Fund data updated', fund: 'Global Equity Fund', time: '15 minutes ago', type: 'fund' },
    { id: 3, action: 'AI chat session started', user: 'jane.smith@example.com', time: '23 minutes ago', type: 'chat' },
    { id: 4, action: 'System backup completed', time: '1 hour ago', type: 'system' },
    { id: 5, action: 'New benchmark added', benchmark: 'S&P 500', time: '2 hours ago', type: 'benchmark' },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">{t('message.loading', { default: 'Loading...' })}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-600 p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchAdminStats}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            {t('button.retry', { default: 'Retry' })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 serif mb-2">
              {t('welcome', { default: 'Welcome back' })}, {user?.firstName}!
            </h1>
            <p className="text-gray-600 text-lg">
              {t('subtitle', { default: 'Here\'s what\'s happening with your platform today.' })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="bg-white border-2 border-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats.total_users)}
              </div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                {t('stats.totalUsers', { default: 'Total Users' })}
              </div>
            </div>

            {/* Total Funds */}
            <div className="bg-white border-2 border-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats.total_funds)}
              </div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                {t('stats.totalFunds', { default: 'Total Funds' })}
              </div>
            </div>

            {/* AI Chats */}
            <div className="bg-white border-2 border-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats.total_chats)}
              </div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                {t('stats.aiChats', { default: 'AI Chats' })}
              </div>
            </div>

            {/* Tokens Used */}
            <div className="bg-white border-2 border-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats.tokens_used)}
              </div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                {t('stats.tokensUsed', { default: 'Tokens Used' })}
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white border-2 border-gray-800 shadow-lg">
                <div className="border-b-2 border-gray-800 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900 serif">
                    {t('recentActivity', { default: 'Recent Activity' })}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-4 p-4 bg-gray-50 border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'user' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'fund' ? 'bg-green-100 text-green-600' :
                          activity.type === 'chat' ? 'bg-purple-100 text-purple-600' :
                          activity.type === 'benchmark' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {activity.type === 'user' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                          {activity.type === 'fund' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          )}
                          {activity.type === 'chat' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                          {activity.type === 'benchmark' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          )}
                          {activity.type === 'system' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {activity.action}
                          </p>
                          {(activity.user || activity.fund || activity.benchmark) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {activity.user || activity.fund || activity.benchmark}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white border-2 border-gray-800 shadow-lg mb-6">
                <div className="border-b-2 border-gray-800 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900 serif">
                    {t('quickActions', { default: 'Quick Actions' })}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button className="w-full bg-black hover:bg-gray-800 text-white px-4 py-3 font-medium transition-colors duration-200 text-sm uppercase tracking-wide flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>{t('actions.addUser', { default: 'Add User' })}</span>
                    </button>
                    <button
                      onClick={fetchAdminStats}
                      className="w-full bg-gray-800 hover:bg-black text-white px-4 py-3 font-medium transition-colors duration-200 text-sm uppercase tracking-wide flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{t('actions.syncData', { default: 'Sync Data' })}</span>
                    </button>
                    <button className="w-full bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 font-medium transition-colors duration-200 text-sm uppercase tracking-wide flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>{t('actions.viewReports', { default: 'View Reports' })}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white border-2 border-gray-800 shadow-lg">
                <div className="border-b-2 border-gray-800 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900 serif">
                    {t('systemStatus', { default: 'System Status' })}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('status.api', { default: 'API' })}</span>
                      <span className="flex items-center text-green-600 text-sm font-semibold">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                        {t('status.online', { default: 'Online' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('status.database', { default: 'Database' })}</span>
                      <span className="flex items-center text-green-600 text-sm font-semibold">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                        {t('status.online', { default: 'Online' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('status.aiAgent', { default: 'AI Agent' })}</span>
                      <span className="flex items-center text-green-600 text-sm font-semibold">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                        {t('status.online', { default: 'Online' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('status.vectorDB', { default: 'Vector DB' })}</span>
                      <span className="flex items-center text-green-600 text-sm font-semibold">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                        {t('status.online', { default: 'Online' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
