import axios, { AxiosHeaders } from 'axios';
import { getToken, getRefreshToken } from '../services/auth';
import { API_BASE_URL } from '../config';
import { APIError } from './apiErrors';

// Constants
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 1;

// Create an axios instance with default config
export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: false,  // Changed to false since we're using JWT tokens
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
            if (error.response?.status === 503 && (!originalRequest._retry || originalRequest._retryCount < MAX_RETRIES)) {
                originalRequest._retry = true;
                originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
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
                localStorage.setItem('token', access);

                isRefreshing = false;
                onTokenRefreshed(access);

                // Update the failed request with new token and retry
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return axios(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                // Clear tokens on refresh failure
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
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
