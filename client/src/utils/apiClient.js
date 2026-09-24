import axios from 'axios';

// ============================================================
// API BASE URL
// ============================================================

const API_PORT = 5000;
const API_PREFIX = '/api/v1';

// Automatically detects the hostname being used
// to access the frontend.
//
// Computer:
// http://localhost:5173
// -> http://localhost:5000/api/v1
//
// Phone:
// http://192.168.1.5:5173
// -> http://192.168.1.5:5000/api/v1
//
// VITE_API_URL can override this when required.

const getBaseURL = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;

  if (envApiUrl && envApiUrl.trim()) {
    return envApiUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    return `http://${hostname}:${API_PORT}${API_PREFIX}`;
  }

  return `http://localhost:${API_PORT}${API_PREFIX}`;
};

const API_BASE_URL = getBaseURL();

// Development logging
if (import.meta.env.DEV) {
  console.log('==========================================');
  console.log('EAZY DON CHECK API');
  console.log('API Base URL:', API_BASE_URL);

  if (typeof window !== 'undefined') {
    console.log(
      'Frontend Host:',
      window.location.hostname
    );
  }

  console.log('==========================================');
}

// ============================================================
// AXIOS INSTANCE
// ============================================================

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// Automatically attaches JWT
// ============================================================

apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('eazy_check_token');

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    // IMPORTANT:
    // Do not force Content-Type for FormData.
    // Axios creates the correct multipart boundary.
    if (
      typeof FormData !== 'undefined' &&
      config.data instanceof FormData
    ) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    // Network / connection error
    if (!error.response) {
      console.error(
        'EAZY DON CHECK API connection failed.'
      );

      console.error(
        'Attempted API:',
        API_BASE_URL
      );

      console.error(
        'Error:',
        error.message
      );
    }

    // Authentication failure
    if (error.response?.status === 401) {
      console.warn(
        'Authentication failed. JWT may be missing or expired.'
      );

      // AuthContext remains responsible for
      // logout/navigation.
    }

    return Promise.reject(error);
  }
);

// ============================================================
// EXPORT
// ============================================================

export default apiClient;