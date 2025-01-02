/**
 * @fileoverview Employee service that handles employee-related operations including
 * time entries, clock in/out, and employee information. Implements caching for
 * employee info to reduce API calls.
 */

import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { handleAPIError } from '../utils/apiErrors';
import { getUserData } from './auth';

/**
 * Interface for employee information
 */
export interface EmployeeInfo {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: number;
    email: string;
    vacation_hours_allocated: number;
    vacation_hours_used: number;
    sick_hours_allocated: number;
    sick_hours_used: number;
    vacation_hours_remaining: number;
    sick_hours_remaining: number;
    years_employed: number;
    vacation_hours_allocated_display: string;
    vacation_hours_used_display: string;
    vacation_hours_remaining_display: string;
    sick_hours_allocated_display: string;
    sick_hours_used_display: string;
    sick_hours_remaining_display: string;
}

/**
 * Interface for time entry notes
 */
export interface Note {
    note_text: string;
    created_at: string;
    created_by: {
        username: string;
    };
}

/**
 * Interface for time entry data
 */
export interface TimeEntry {
    id: number;
    clock_in_time: string;
    clock_out_time: string | null;
    hours_worked: number | null;
    hours_worked_display: string;
    notes: Note[];
    is_vacation: boolean;
    is_sick: boolean;
}

/**
 * Interface for time entries API response
 */
export interface TimeEntriesResponse {
    entries: TimeEntry[];
    total_hours: string;
    weekly_totals: { [key: string]: string };
    clocked_in: boolean;
    clock_in_time: string | null;
}

/** Cache for employee info to reduce API calls */
let cachedEmployeeInfo: EmployeeInfo | null = null;
/** Timestamp of last cache update */
let lastFetchTime = 0;
/** Cache duration in milliseconds */
const CACHE_DURATION = 3600000; // 1 hour cache

/**
 * Fetches employee information with caching.
 * Returns cached data if available and not expired.
 * 
 * @returns Promise that resolves to employee information
 * @throws APIError if request fails
 */
export const getEmployeeInfo = async (): Promise<EmployeeInfo> => {
    try {
        const now = Date.now();
        
        // Return cached data if it's still valid
        if (cachedEmployeeInfo && (now - lastFetchTime) < CACHE_DURATION) {
            return cachedEmployeeInfo;
        }

        // Check if user is admin-only
        const userData = getUserData();
        if (userData?.is_staff && userData.employee === false) {
            throw new Error('ADMIN_NO_EMPLOYEE_RECORD');
        }

        const response = await axiosInstance.get<EmployeeInfo>(API_ENDPOINTS.EMPLOYEE.INFO);
        cachedEmployeeInfo = response.data;
        lastFetchTime = now;
        return response.data;
    } catch (error) {
        clearEmployeeInfoCache();
        return handleAPIError(error);
    }
};

/**
 * Clears the employee information cache.
 * Should be called when employee data might have changed.
 */
export const clearEmployeeInfoCache = () => {
    cachedEmployeeInfo = null;
    lastFetchTime = 0;
};

// Alias for consistency with other code
export const fetchEmployeeInfo = getEmployeeInfo;

/**
 * Fetches time entries for the employee.
 * 
 * @param date - Optional date to filter entries
 * @returns Promise that resolves to time entries response
 * @throws APIError if request fails
 */
export const getTimeEntries = async (date?: string): Promise<TimeEntriesResponse> => {
    try {
        const url = date
            ? `${API_ENDPOINTS.EMPLOYEE.TIME_ENTRIES}?date=${date}`
            : API_ENDPOINTS.EMPLOYEE.TIME_ENTRIES;
        
        const response = await axiosInstance.get<TimeEntriesResponse>(url);
        return response.data;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Records a clock in event for the employee.
 * 
 * @throws APIError if request fails
 */
export const clockIn = async (): Promise<void> => {
    try {
        await axiosInstance.post(API_ENDPOINTS.EMPLOYEE.CLOCK);
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Records a clock out event for the employee.
 * 
 * @throws APIError if request fails
 */
export const clockOut = async (): Promise<void> => {
    try {
        await axiosInstance.post(`${API_ENDPOINTS.EMPLOYEE.CLOCK}out/`);
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Updates the employee's background image preference.
 * 
 * @param backgroundImage - Name of the background image file
 * @throws APIError if request fails
 */
export const updateBackgroundImage = async (backgroundImage: string): Promise<void> => {
    try {
        await axiosInstance.post(API_ENDPOINTS.EMPLOYEE.BACKGROUND_IMAGE, { 
            background_image: backgroundImage 
        });
    } catch (error) {
        return handleAPIError(error);
    }
};
