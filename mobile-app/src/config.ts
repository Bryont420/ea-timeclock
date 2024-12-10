// Environment-based configuration management
const isDevelopment = process.env.NODE_ENV === 'development';

// Dynamically determine the API base URL based on environment and hostname
const getApiBaseUrl = () => {
    // Use environment variables if provided
    if (process.env.REACT_APP_API_URL) {
        return {
            api: process.env.REACT_APP_API_URL,
            static: process.env.REACT_APP_STATIC_URL || process.env.REACT_APP_API_URL
        };
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
            // Force HTTPS in production, allow HTTP only in development
            api: isDevelopment ? 'http://127.0.0.1:8000' : 'https://127.0.0.1:8000',
            static: isDevelopment ? 'http://127.0.0.1:3000' : 'https://127.0.0.1:3000'
        };
    }
    
    // For production/remote access - always use HTTPS
    return {
        api: 'https://ea-time-clock.duckdns.org:1832',
        static: 'https://ea-time-clock.duckdns.org:1832'
    };
};

const urls = getApiBaseUrl();

// Ensure URLs are using HTTPS in production
const enforceHttps = (url: string) => {
    if (!isDevelopment && url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    return url;
};

export const API_BASE_URL = enforceHttps(urls.api);
export const STATIC_BASE_URL = enforceHttps(urls.static);

// Maximum file upload size in bytes (5MB)
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

// Token refresh interval in milliseconds (4 minutes)
export const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

// Request timeout in milliseconds (30 seconds)
export const REQUEST_TIMEOUT = 30000;

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
    EMPLOYEES: 5 * 60 * 1000,        // 5 minutes
    TIME_ENTRIES: 30 * 1000,         // 30 seconds
    USER_PROFILE: 15 * 60 * 1000,    // 15 minutes
};

// Performance limits
export const PERFORMANCE_LIMITS = {
    MAX_PAGE_SIZE: 100,
    MAX_DATE_RANGE_DAYS: 90,
    DEBOUNCE_DELAY: 300,
    MAX_RETRY_ATTEMPTS: 3,
};

// Error messages
export const ERROR_MESSAGES = {
    INVALID_DATE_RANGE: 'Date range must be within 90 days',
    NETWORK_ERROR: 'Network error occurred. Please try again',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    SESSION_EXPIRED: 'Your session has expired. Please log in again',
};

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/login/',
        REFRESH: '/api/token/refresh/',
        LOGOUT: '/api/logout/'
    },
    EMPLOYEE: {
        BACKGROUND_IMAGE: '/api/employee/background-image/',
        PROFILE: '/api/employee/profile/',
        CLOCK: '/api/employee/clock/',
        SCHEDULE: '/api/employee/schedule/',
        INFO: '/api/employee/info/',
        TIME_ENTRIES: '/api/employee/time-entries/',
    },
    TIME_OFF: {
        LIST: '/api/time-off-requests/',
        CREATE: '/api/time-off-requests/',
        DETAIL: (id: string) => `/api/time-off-requests/${id}/`,
        REVIEW: (id: string) => `/api/time-off-requests/${id}/review/`
    },
    ADMIN: {
        BASE_URL: '/api/admin',
        EMPLOYEES: '/api/admin/employees/',
        TIME_ENTRIES: '/api/admin/time-entries/',
        TIME_OFF_REQUESTS: '/api/admin/time-off-requests/'
    }
};
