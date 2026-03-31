/**
 * API Configuration
 * Handles environment-based API endpoints for development and production
 **/

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Configuration object
const config = {
  // Development (localhost)
  development: {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
    frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  },
  // Production
  production: {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.thestock.club',
    frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://thestock.club',
  },
};

// Get current environment config
const getCurrentConfig = () => {
  if (isDevelopment) {
    return config.development;
  }
  return config.production;
};

// Export configuration
export const API_BASE_URL = getCurrentConfig().apiBaseUrl;
export const FRONTEND_URL = getCurrentConfig().frontendUrl;

// Export the entire config for advanced usage
export const apiConfig = config;

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  const baseUrl = API_BASE_URL;
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
};

// Helper function to get full frontend URL
export const getFrontendUrl = (path = '') => {
  const baseUrl = FRONTEND_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

export default {
  API_BASE_URL,
  FRONTEND_URL,
  apiConfig,
  getApiUrl,
  getFrontendUrl,
};
