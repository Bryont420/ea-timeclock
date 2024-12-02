import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { handleAPIError } from '../utils/apiErrors';

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

export const getTimeOffRequests = async (): Promise<TimeOffRequest[]> => {
    try {
        const response = await axiosInstance.get<TimeOffRequest[]>(API_ENDPOINTS.TIME_OFF.LIST);
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

export const getTimeOffRequest = async (id: string): Promise<TimeOffRequest> => {
    try {
        const response = await axiosInstance.get<TimeOffRequest>(API_ENDPOINTS.TIME_OFF.DETAIL(id));
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

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

export const updateTimeOffRequest = async (
    id: string,
    request: CreateTimeOffRequest
): Promise<TimeOffRequest> => {
    try {
        const response = await axiosInstance.put<TimeOffRequest>(
            API_ENDPOINTS.TIME_OFF.DETAIL(id),
            request
        );
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

export const deleteTimeOffRequest = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(API_ENDPOINTS.TIME_OFF.DETAIL(id));
    } catch (error) {
        return handleAPIError(error);
    }
};
