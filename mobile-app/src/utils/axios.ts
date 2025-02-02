import axios, { AxiosHeaders } from 'axios';
import { getToken, getRefreshToken } from '../services/auth';
import { API_BASE_URL } from '../config';
import { APIError } from './apiErrors';

// Create a safe delay function with bounds
const safeDelay = (ms: number): Promise<void> => {
    // Ensure the delay is a number and within reasonable bounds (100ms to 10s)
    const boundedDelay = Math.min(Math.max(Number(ms) || 2000, 100), 10000);
    return new Promise(resolve => setTimeout(resolve, boundedDelay));
};

// Create an axios instance with default config
export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },
    withCredentials: false,  // Changed to false since we're using JWT tokens
    timeout: 30000, // 30 second timeout
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Add authorization header to all requests
axiosInstance.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            if (!config.headers) {
                config.headers = new AxiosHeaders();
            }
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add cache control headers only for dynamic data endpoints
        if (config.url && (
            config.url.includes('/api/admin/') ||
            config.url.includes('/api/employee/') ||
            config.url.includes('/api/time-off-requests/') ||
            config.url.includes('/api/time-entries/')
        )) {
            if (!config.headers) {
                config.headers = new AxiosHeaders();
            }
            config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            config.headers['Pragma'] = 'no-cache';
            config.headers['Expires'] = '0';
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
    refreshSubscribers.map(cb => cb(token));
    refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If it's a login request that failed, just reject with the error
        if (originalRequest.url?.includes('/api/token/') && !originalRequest.url?.includes('/refresh/')) {
            return Promise.reject(error);
        }

        // If error response is not 401 or request was for refresh token, reject
        if (!error.response || error.response.status !== 401 || originalRequest.url === API_BASE_URL + '/api/token/refresh/') {
            // If it's a 503 error, wait a bit and retry once
            if (error.response?.status === 503 && !originalRequest._retry) {
                originalRequest._retry = true;
                // Use a fixed delay with safety bounds for 503 errors
                await safeDelay(2000); // 2 seconds
                return axios(originalRequest);
            }
            return Promise.reject(error);
        }

        if (!isRefreshing) {
            isRefreshing = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    throw new APIError('Session expired. Please log in again.', 401);
                }

                const response = await axios.post(API_BASE_URL + '/api/token/refresh/', {
                    refresh: refreshToken
                });

                const { access } = response.data;

                // Store new access token
                sessionStorage.setItem('token', access);

                isRefreshing = false;
                onTokenRefreshed(access);

                // Update the failed request with new token and retry
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return axios(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                // Clear tokens on refresh failure
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refresh_token');
                sessionStorage.removeItem('user');
                return Promise.reject(new APIError('Invalid username or password', 401));
            }
        }

        // Queue the failed request to be retried after token refresh
        return new Promise(resolve => {
            subscribeTokenRefresh(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(axios(originalRequest));
            });
        });
    }
);
