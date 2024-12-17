/**
 * @fileoverview Admin context provider that manages admin-specific refresh callbacks
 * for employees and time entries data. This context enables components to trigger
 * data refreshes without direct coupling to the data fetching logic.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { useAuth } from './AuthContext';
import { Employee } from '../types/employee';
import { axiosInstance } from '../utils/axios';

/**
 * Interface defining the shape of the AdminContext.
 */
export interface AdminContextType {
    /** List of all employees */
    employees: Employee[];
    /** Loading state for employees */
    employeesLoading: boolean;
    /** Error state for employees */
    employeesError: string | null;
    /** Callback to refresh employees data */
    refreshEmployees: () => void;
    /** Function to set the employees refresh callback */
    setRefreshEmployees: (callback: () => void) => void;
    /** Callback to refresh time entries data */
    refreshTimeEntries: () => void;
    /** Function to set the time entries refresh callback */
    setRefreshTimeEntries: (callback: () => void) => void;
}

/** Admin context with default values */
const AdminContext = createContext<AdminContextType>({
    employees: [],
    employeesLoading: false,
    employeesError: null,
    refreshEmployees: () => {},
    setRefreshEmployees: () => {},
    refreshTimeEntries: () => {},
    setRefreshTimeEntries: () => {},
});

/**
 * Admin context provider component that wraps the application.
 * It manages the state of the refresh callbacks for employees and time entries data.
 */
export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [employeesError, setEmployeesError] = useState<string | null>(null);
    const [refreshEmployees, setRefreshEmployeesState] = useState<() => void>(() => {});
    const [refreshTimeEntries, setRefreshTimeEntriesState] = useState<() => void>(() => {});
    const { user } = useAuth();

    const fetchEmployees = useCallback(async () => {
        if (!user?.is_staff) return;
        
        try {
            setEmployeesLoading(true);
            setEmployeesError(null);
            const response = await axiosInstance.get<Employee[]>(API_ENDPOINTS.ADMIN.EMPLOYEES);
            if (!response.data) throw new Error('Failed to fetch employees');
            setEmployees(response.data);
        } catch (err) {
            console.error('Failed to load employees:', err);
            setEmployeesError('Failed to load employees');
            setEmployees([]);
        } finally {
            setEmployeesLoading(false);
        }
    }, [user?.is_staff]);

    // Fetch employees when the admin user logs in
    useEffect(() => {
        if (user?.is_staff) {
            fetchEmployees();
        }
    }, [user?.is_staff, fetchEmployees]);

    /**
     * Memoized function to set the employees refresh callback.
     * @param callback The new callback function to set.
     */
    const setRefreshEmployees = useCallback((callback: () => void) => {
        setRefreshEmployeesState(() => callback);
    }, []);

    /**
     * Memoized function to set the time entries refresh callback.
     * @param callback The new callback function to set.
     */
    const setRefreshTimeEntries = useCallback((callback: () => void) => {
        setRefreshTimeEntriesState(() => callback);
    }, []);

    return (
        <AdminContext.Provider
            value={{
                employees,
                employeesLoading,
                employeesError,
                refreshEmployees,
                setRefreshEmployees,
                refreshTimeEntries,
                setRefreshTimeEntries,
            }}
        >
            {children}
        </AdminContext.Provider>
    );
};

/**
 * Custom hook to access the AdminContext.
 * Throws an error if used outside of an AdminProvider.
 */
export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

export default AdminContext;
