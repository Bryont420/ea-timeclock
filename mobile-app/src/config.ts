// Dynamically determine the API base URL based on the current hostname
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;

    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
            api: 'http://127.0.0.1:8000',  // Django development server
            static: 'http://127.0.0.1:3000' // React development server
        };
    }
    
    // For production/remote access
    return {
        api: 'https://ea-time-clock.duckdns.org:1832',
        static: 'https://ea-time-clock.duckdns.org:1832'
    };
};

const urls = getApiBaseUrl();

export const API_BASE_URL = urls.api;
export const STATIC_BASE_URL = urls.static;

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
        EMPLOYEES: '/api/admin/employees/',
        TIME_ENTRIES: '/api/admin/time-entries/',
        TIME_OFF_REQUESTS: '/api/admin/time-off-requests/'
    }
};
