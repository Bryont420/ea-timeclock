import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { handleAPIError } from '../utils/apiErrors';
import { getUserData } from './auth';

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

export interface Note {
    note_text: string;
    created_at: string;
    created_by: {
        username: string;
    };
}

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

export interface TimeEntriesResponse {
    entries: TimeEntry[];
    total_hours: string;
    weekly_totals: { [key: string]: string };
    clocked_in: boolean;
    clock_in_time: string | null;
}

let cachedEmployeeInfo: EmployeeInfo | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour cache

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

export const clearEmployeeInfoCache = () => {
    cachedEmployeeInfo = null;
    lastFetchTime = 0;
};

// Alias for consistency with other code
export const fetchEmployeeInfo = getEmployeeInfo;

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

export const clockIn = async (): Promise<void> => {
    try {
        await axiosInstance.post(API_ENDPOINTS.EMPLOYEE.CLOCK);
    } catch (error) {
        return handleAPIError(error);
    }
};

export const clockOut = async (): Promise<void> => {
    try {
        await axiosInstance.post(`${API_ENDPOINTS.EMPLOYEE.CLOCK}out/`);
    } catch (error) {
        return handleAPIError(error);
    }
};

export const updateBackgroundImage = async (backgroundImage: string): Promise<void> => {
    try {
        await axiosInstance.post(API_ENDPOINTS.EMPLOYEE.BACKGROUND_IMAGE, { 
            background_image: backgroundImage 
        });
    } catch (error) {
        return handleAPIError(error);
    }
};
