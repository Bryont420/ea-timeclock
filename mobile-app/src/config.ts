/**
 * @fileoverview Application configuration and environment settings.
 * Manages environment-specific configuration including API endpoints,
 * security settings, and application constants. Handles development
 * and production environments with appropriate security measures.
 */

/**
 * Environment detection flag
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Determines the appropriate API base URLs based on environment and hostname.
 * Prioritizes:
 * 1. Environment variables if provided
 * 2. Local development URLs for localhost
 * 3. Production URLs for remote access
 * 
 * @returns Object containing API and static content URLs
 */
const getApiBaseUrl = () => {
    // Use environment variables if provided
    if (process.env.REACT_APP_API_URL) {
        return {
            api: process.env.REACT_APP_API_URL,
            static: process.env.REACT_APP_STATIC_URL || process.env.REACT_APP_API_URL
        };
    }

    const hostname = window.location.hostname;

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

/**
 * Ensures URLs use HTTPS in production environment.
 * Only allows HTTP in development mode.
 * 
 * @param url - URL to check and potentially modify
 * @returns URL with appropriate protocol
 */
const enforceHttps = (url: string) => {
    if (!isDevelopment && url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    return url;
};

/** Base URL for API endpoints */
export const API_BASE_URL = enforceHttps(urls.api);

/** Base URL for static content */
export const STATIC_BASE_URL = enforceHttps(urls.static);

/** Maximum allowed file upload size (5MB) */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

/** JWT token refresh interval (4 minutes) */
export const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

/** API request timeout (30 seconds) */
export const REQUEST_TIMEOUT = 30 * 1000;

/**
 * Cache durations in milliseconds
 */
export const CACHE_DURATIONS = {
    EMPLOYEES: 5 * 60 * 1000,        // 5 minutes
    TIME_ENTRIES: 30 * 1000,         // 30 seconds
    USER_PROFILE: 15 * 60 * 1000,    // 15 minutes
};

/**
 * Performance limits
 */
export const PERFORMANCE_LIMITS = {
    MAX_PAGE_SIZE: 100,
    MAX_DATE_RANGE_DAYS: 90,
    DEBOUNCE_DELAY: 300,
    MAX_RETRY_ATTEMPTS: 3,
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
    INVALID_DATE_RANGE: 'Date range must be within 90 days',
    NETWORK_ERROR: 'Network error occurred. Please try again',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    SESSION_EXPIRED: 'Your session has expired. Please log in again',
};

/**
 * API endpoint configurations.
 * Organized by feature area (auth, employee, admin, etc.)
 * with nested route definitions.
 */
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/login/',
        LOGOUT: '/api/logout/',
        REFRESH: '/api/token/refresh/',
        BIOMETRIC_LOGIN: '/api/auth/biometric-login/',
        BIOMETRIC_REGISTER: '/api/auth/biometric-register/',
        VERIFY: '/api/verify/',
        PASSWORD_RESET_REQUEST: '/api/password-reset/request/',
        PASSWORD_RESET: '/api/password-reset/',
        CHANGE_PASSWORD: '/api/auth/change-password/',
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
