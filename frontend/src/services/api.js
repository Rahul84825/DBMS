import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    let errorMessage = 'An unexpected error occurred.';
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = error.response ? error.response.status : null;
    let details = null;

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The backend server took too long to respond.';
        errorCode = 'REQUEST_TIMEOUT';
      } else {
        errorMessage = 'Unable to connect to the backend server. Please verify the backend is running at http://localhost:5000.';
        errorCode = 'NETWORK_ERROR';
      }
    } else {
      const data = error.response.data;
      if (data && data.error) {
        errorMessage = data.error.message || errorMessage;
        errorCode = data.error.code || errorCode;
        details = data.error.details || null;
      } else if (data && data.message) {
        errorMessage = data.message;
      } else {
        switch (statusCode) {
          case 400:
            errorMessage = 'Invalid request parameters or payload.';
            errorCode = 'BAD_REQUEST';
            break;
          case 404:
            errorMessage = 'The requested resource was not found.';
            errorCode = 'NOT_FOUND';
            break;
          case 409:
            errorMessage = 'Conflict: Record cannot be modified or deleted due to existing relationships.';
            errorCode = 'CONFLICT';
            break;
          case 500:
            errorMessage = 'Backend internal server error. Check database status.';
            errorCode = 'SERVER_ERROR';
            break;
          case 503:
            errorMessage = 'Backend service or database is currently unavailable.';
            errorCode = 'SERVICE_UNAVAILABLE';
            break;
          default:
            errorMessage = `Request failed with status code ${statusCode}.`;
        }
      }
    }

    const customError = new Error(errorMessage);
    customError.code = errorCode;
    customError.status = statusCode;
    customError.details = details;
    customError.isNetworkError = !error.response;

    return Promise.reject(customError);
  }
);

/**
 * Health check helper to test backend and database status
 */
export async function checkBackendHealth() {
  const backendOrigin = BASE_URL.replace(/\/api\/v1\/?$/, '');
  try {
    const res = await axios.get(`${backendOrigin}/api/health`, { timeout: 5000 });
    return res.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return err.response.data;
    }
    return {
      status: 'offline',
      service: 'Smart Farm DBMS REST API',
      database: {
        connected: false,
        message: 'Could not connect to backend server at ' + backendOrigin,
      },
    };
  }
}

export default apiClient;
