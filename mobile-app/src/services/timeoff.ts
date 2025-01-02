/**
 * @fileoverview Time off service that handles all time off request operations.
 * Provides functionality for creating, reviewing, updating, and deleting time
 * off requests with validation and error handling.
 */

import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { handleAPIError } from '../utils/apiErrors';

/**
 * Interface for time off request data
 */
export interface TimeOffRequest {
    id: string;
    employee: string;
    start_date: string;
    end_date: string;
    request_type: 'vacation' | 'sick' | 'unpaid';
    request_type_display?: string;
    status: 'pending' | 'approved' | 'denied';
    status_display?: string;
    hours_requested: number;
    reason: string;
    created_at: string;
    updated_at: string;
    employee_name?: string;
    is_partial_day: boolean;
    start_time?: string;
    end_time?: string;
}

/**
 * Interface for creating a new time off request
 */
export interface CreateTimeOffRequest {
    start_date: string;
    end_date: string;
    request_type: 'vacation' | 'sick' | 'unpaid';
    reason: string;
    hours_requested: number;
    is_partial_day: boolean;
    start_time?: string;
    end_time?: string;
}

/**
 * Interface for time off request error response
 */
export interface TimeOffError extends Error {
    response?: {
        data: {
            error?: string;
            message?: string;
            hours_requested?: number;
            hours_remaining?: number;
            overlapping_request?: {
                start: string;
                end: string;
                type: string;
            };
        };
    };
}

/**
 * Creates a new time off request.
 * 
 * @param request - Time off request data
 * @returns Promise that resolves to created request
 * @throws TimeOffError if request fails
 */
export const createTimeOffRequest = async (request: CreateTimeOffRequest): Promise<TimeOffRequest> => {
    try {
        const response = await axiosInstance.post<TimeOffRequest>(
            API_ENDPOINTS.TIME_OFF.CREATE,
            request
        );
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Fetches all time off requests for the current user.
 * For admin users, returns all requests.
 * 
 * @returns Promise that resolves to array of time off requests
 * @throws APIError if request fails
 */
export const getTimeOffRequests = async (): Promise<TimeOffRequest[]> => {
    try {
        const response = await axiosInstance.get<TimeOffRequest[]>(API_ENDPOINTS.TIME_OFF.LIST);
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Fetches a specific time off request by ID.
 * 
 * @param id - Request ID to fetch
 * @returns Promise that resolves to time off request
 * @throws APIError if request fails
 */
export const getTimeOffRequest = async (id: string): Promise<TimeOffRequest> => {
    try {
        const response = await axiosInstance.get<TimeOffRequest>(API_ENDPOINTS.TIME_OFF.DETAIL(id));
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Reviews (approves/denies) a time off request.
 * Only available to admin users.
 * 
 * @param id - Request ID to review
 * @param action - Review action (approve/deny)
 * @param review_notes - Optional notes for the review
 * @returns Promise that resolves to updated request
 * @throws APIError if request fails
 */
export const reviewTimeOffRequest = async (
    id: string,
    action: 'approve' | 'deny',
    review_notes?: string
): Promise<TimeOffRequest> => {
    try {
        const response = await axiosInstance.post<TimeOffRequest>(
            API_ENDPOINTS.TIME_OFF.REVIEW(id),
            { action, review_notes }
        );
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Updates an existing time off request.
 * Only available for pending requests.
 * 
 * @param id - Request ID to update
 * @param request - Updated request data
 * @returns Promise that resolves to updated request
 * @throws APIError if request fails
 */
export const updateTimeOffRequest = async (
    id: string,
    request: CreateTimeOffRequest
): Promise<TimeOffRequest> => {
    try {
        const response = await axiosInstance.put<TimeOffRequest>(
            API_ENDPOINTS.TIME_OFF.DETAIL(id),
            { ...request, update_type: 'modify' }
        );
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Deletes a time off request.
 * Only available for pending requests.
 * 
 * @param id - Request ID to delete
 * @throws APIError if request fails
 */
export const deleteTimeOffRequest = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(API_ENDPOINTS.TIME_OFF.DETAIL(id));
    } catch (error) {
        return handleAPIError(error);
    }
};
