import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - no authentication needed for demo
api.interceptors.request.use(
  (config) => {
    // Demo mode - no authentication tokens needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors  
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log error for debugging
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;