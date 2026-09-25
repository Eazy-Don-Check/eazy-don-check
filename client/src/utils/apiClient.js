import axios from 'axios';

// ============================================================
// EAZY DON CHECK — API CONFIGURATION
// ============================================================

const API_PORT = 5000;
const API_PREFIX = '/api/v1';

// Production backend deployed on Render.
// This is used automatically when the frontend is running
// on Vercel/another HTTPS production host.
const PRODUCTION_API_URL =
  'https://eazy-don-check-api.onrender.com/api/v1';

// ============================================================
// GET API BASE URL
// ============================================================

const getBaseURL = () => {
  /*
   * Priority 1:
   * VITE_API_BASE_URL
   *
   * This is the production variable configured in Vercel.
   */
  const envApiBaseUrl =
    import.meta.env.VITE_API_BASE_URL;

  if (
    envApiBaseUrl &&
    envApiBaseUrl.trim()
  ) {
    return envApiBaseUrl
      .trim()
      .replace(/\/+$/, '');
  }

  /*
   * Priority 2:
   * VITE_API_URL
   *
   * Kept for backwards compatibility with
   * older local/deployment configurations.
   */
  const envApiUrl =
    import.meta.env.VITE_API_URL;

  if (
    envApiUrl &&
    envApiUrl.trim()
  ) {
    return envApiUrl
      .trim()
      .replace(/\/+$/, '');
  }

  /*
   * Production fallback.
   *
   * If the frontend is being accessed over HTTPS,
   * never construct an HTTP API URL from the frontend
   * hostname. That causes browser Mixed Content errors.
   */
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:'
  ) {
    return PRODUCTION_API_URL;
  }

  /*
   * Local development.
   *
   * Computer:
   * http://localhost:5173
   * -> http://localhost:5000/api/v1
   *
   * Phone on same Wi-Fi:
   * http://192.168.x.x:5173
   * -> http://192.168.x.x:5000/api/v1
   */
  if (
    typeof window !== 'undefined'
  ) {
    const hostname =
      window.location.hostname;

    return `http://${hostname}:${API_PORT}${API_PREFIX}`;
  }

  return `http://localhost:${API_PORT}${API_PREFIX}`;
};

const API_BASE_URL = getBaseURL();

// ============================================================
// DEVELOPMENT / DIAGNOSTIC LOGGING
// ============================================================

if (import.meta.env.DEV) {
  console.log(
    '=========================================='
  );

  console.log(
    'EAZY DON CHECK API'
  );

  console.log(
    'API Base URL:',
    API_BASE_URL
  );

  if (
    typeof window !== 'undefined'
  ) {
    console.log(
      'Frontend Host:',
      window.location.hostname
    );

    console.log(
      'Frontend Protocol:',
      window.location.protocol
    );
  }

  console.log(
    '=========================================='
  );
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
      localStorage.getItem(
        'eazy_check_token'
      );

    config.headers =
      config.headers || {};

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * Do not force Content-Type for FormData.
     * Axios automatically creates the correct
     * multipart boundary.
     */
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
    // --------------------------------------------------------
    // Network / connection error
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Authentication failure
    // --------------------------------------------------------

    if (
      error.response?.status === 401
    ) {
      console.warn(
        'Authentication failed. JWT may be missing or expired.'
      );

      /*
       * AuthContext remains responsible for
       * logout/navigation.
       */
    }

    return Promise.reject(error);
  }
);

// ============================================================
// EXPORT
// ============================================================

export default apiClient;