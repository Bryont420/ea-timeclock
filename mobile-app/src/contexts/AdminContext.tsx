/**
 * @fileoverview Admin context provider that manages admin-specific refresh callbacks
 * for employees and time entries data. This context enables components to trigger
 * data refreshes without direct coupling to the data fetching logic.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Interface defining the shape of the AdminContext.
 */
export interface AdminContextType {
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
    const [refreshEmployees, setRefreshEmployeesState] = useState<() => void>(() => {});
    const [refreshTimeEntries, setRefreshTimeEntriesState] = useState<() => void>(() => {});

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
