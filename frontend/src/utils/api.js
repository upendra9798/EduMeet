import axios from 'axios';

// Get the current host for mobile compatibility
const getApiUrl = () => {
  // If environment variable is set, use it (production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect based on current environment
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development - use network IP for mobile compatibility
    return 'http://172.23.247.244:5001/api';
  } else if (hostname.includes('your-domain.com')) {
    // Production - use HTTPS API endpoint
    return 'https://your-domain.com/api';
  } else {
    // Fallback - use same host as frontend (works for most deployments)
    const port = protocol === 'https:' ? '' : ':5001';
    return `${protocol}//${hostname}${port}/api`;
  }
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000, // Increased timeout for mobile networks
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - no authentication needed for demo
api.interceptors.request.use(
  (config) => {
    // Demo mode - no authentication tokens needed
    // Add mobile-friendly headers
    config.headers['Accept'] = 'application/json';
    config.headers['Content-Type'] = 'application/json';
    
    // Log request for debugging on mobile
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors  
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    // Enhanced error logging for mobile debugging
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      } : 'No response',
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL
      } : 'No config'
    });
    
    // Handle network errors specifically for mobile
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      console.error('Network error detected - possibly CORS or connection issue');
    }
    
    return Promise.reject(error);
  }
);

export default api;