import axios, { AxiosHeaders } from 'axios';
import { getToken, getRefreshToken } from '../services/auth';
import { API_BASE_URL } from '../config';
import { APIError } from './apiErrors';

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
                // Use a fixed delay to handle 503 errors
                const retryDelay = 2000; // 2 seconds
                await new Promise(resolve => setTimeout(resolve, retryDelay));
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
