/**
 * @fileoverview AdminDashboard component that provides an interface for administrators
 * to view and manage employee data. This component fetches and displays a list of
 * employees, automatically refreshing the data every 30 seconds.
 */

import React, { useState, useEffect, memo } from 'react';
import {
    Container,
    Typography,
    Box,
} from '@mui/material';
import { useAdmin } from '../contexts/AdminContext';
import { API_ENDPOINTS } from '../config';
import { Employee } from '../types/employee';
import { EmployeeGrid } from '../components/admin/EmployeeGrid';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';

/**
 * AdminDashboard component that renders the main administrative interface.
 * Features:
 * - Displays a grid of all employees
 * - Auto-refreshes employee data every 30 seconds
 * - Handles loading states and error conditions
 * - Integrates with the admin context for global state management
 * 
 * @returns {JSX.Element} The rendered AdminDashboard component
 */
export const AdminDashboard: React.FC = memo(() => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { setRefreshEmployees } = useAdmin();

    /**
     * Fetches employee data from the API and updates the component state.
     * 
     * @async
     */
    const fetchEmployees = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.ADMIN.EMPLOYEES, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                }
            });
            if (!response.ok) throw new Error('Failed to fetch employees');
            const data = await response.json();
            setEmployees(data);
        } catch (err) {
            setError('Failed to load employees');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sets up the component's side effects, including the initial data fetch and
     * interval-based refreshes.
     * 
     * @param {Function} setRefreshEmployees - The function to register for global
     *                                         state management.
     */
    useEffect(() => {
        fetchEmployees();
        
        // Set up an interval to refresh employee data every 30 seconds
        const interval = setInterval(fetchEmployees, 30000);
        
        // Register the refresh function in the context
        if (setRefreshEmployees) {
            setRefreshEmployees(fetchEmployees);
        }
        
        // Clean up interval and context on unmount
        return () => {
            clearInterval(interval);
            if (setRefreshEmployees) {
                setRefreshEmployees(() => {});
            }
        };
    }, [setRefreshEmployees]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error} />;

    return (
        <Container maxWidth="xl">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary' }}>
                    Employee Dashboard
                </Typography>
                <EmployeeGrid employees={employees} />
            </Box>
        </Container>
    );
});
