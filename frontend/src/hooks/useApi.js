'use client';

import { useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Hook for making API calls with loading/error state, dedup prevention, and timeouts.
 *
 * Usage:
 *   const { data, loading, error, fetchData } = useApi();
 *   // then call: fetchData('/api/funds/123', { auth: true })
 */
export function useApi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async (endpoint, options = {}) => {
    const {
      auth = false,
      getSessionToken,
      timeout = DEFAULT_TIMEOUT,
      method = 'GET',
      body,
      headers: extraHeaders = {},
      dedupe = true,
      transform,
    } = options;

    if (dedupe && hasFetched.current) return;
    if (dedupe) hasFetched.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders,
      };

      if (auth && getSessionToken) {
        const token = getSessionToken();
        if (!token) throw new Error('No session token available');
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      const fetchOptions = {
        method,
        headers,
        signal: controller.signal,
      };
      if (body) fetchOptions.body = JSON.stringify(body);

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const finalData = transform ? transform(result) : result;
      setData(finalData);
      return finalData;
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out');
      } else {
        setError(err.message);
      }
      console.error(`API error (${endpoint}):`, err);
      return null;
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    hasFetched.current = false;
    setData(null);
    setError(null);
    setLoading(true);
  }, []);

  return { data, loading, error, fetchData, reset };
}
