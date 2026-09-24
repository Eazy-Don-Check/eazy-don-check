import axios from 'axios';

// ============================================================
// API BASE URL
// ============================================================

const API_PORT = 5000;
const API_PREFIX = '/api/v1';

// Automatically use the same hostname that opened
// the frontend.
//
// Computer:
// http://localhost:5173
// -> http://localhost:5000/api/v1
//
// Phone:
// http://192.168.1.5:5173
// -> http://192.168.1.5:5000/api/v1
//
// VITE_API_BASE_URL can override this when required.

const getBaseURL = () => {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;

  if (envApiUrl && envApiUrl.trim()) {
    return envApiUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    return `http://${hostname}:${API_PORT}${API_PREFIX}`;
  }

  return `http://localhost:${API_PORT}${API_PREFIX}`;
};

const baseURL = getBaseURL();

// Development logging
if (import.meta.env.DEV) {
  console.log('==========================================');
  console.log('EAZY DON CHECK API SERVICE');
  console.log('API Base URL:', baseURL);

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

const API = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// Automatically attaches JWT
// ============================================================

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('eazy_check_token') ||
      localStorage.getItem('token');

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // IMPORTANT:
    // Do not manually set Content-Type for FormData.
    // Axios generates the correct multipart boundary.
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

API.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    // --------------------------------------------------------
    // Network / connection error
    // --------------------------------------------------------

    if (!error.response) {
      console.error(
        'EAZY DON CHECK API connection failed.'
      );

      console.error(
        'Attempted API:',
        baseURL
      );

      console.error(
        'Error:',
        error.message
      );
    }

    // --------------------------------------------------------
    // Authentication failure
    // --------------------------------------------------------

    const status = error.response?.status;

    if (status === 401) {
      console.warn(
        'EAZY CHECK API: Authentication failed.'
      );

      const requestUrl =
        error.config?.url || '';

      const isLoginRequest =
        requestUrl.includes('/auth/login');

      const isRegisterRequest =
        requestUrl.includes('/auth/register');

      if (
        !isLoginRequest &&
        !isRegisterRequest
      ) {
        localStorage.removeItem(
          'eazy_check_token'
        );

        localStorage.removeItem(
          'eazy_check_user'
        );

        const publicRoutes = [
          '/',
          '/login',
          '/signup',
        ];

        const currentPath =
          typeof window !== 'undefined'
            ? window.location.pathname
            : '/';

        const isPublicRoute =
          publicRoutes.includes(currentPath);

        if (!isPublicRoute) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// EXPORT
// ============================================================

export default API;