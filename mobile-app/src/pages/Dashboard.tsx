/**
 * @fileoverview Dashboard page component that serves as the main interface for employees.
 * Displays employee information and provides quick access to common actions like
 * clock in/out and time off requests.
 */

import React, { useEffect, useState } from 'react';
import { 
    Container, 
    Typography,
    Alert
} from '@mui/material';
import { getEmployeeInfo, EmployeeInfo } from '../services/employee';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import EmployeeInfoCard from '../components/dashboard/EmployeeInfoCard';
import QuickActionsPanel from '../components/dashboard/QuickActionsPanel';

/**
 * Dashboard page component that displays employee information and actions.
 * Features:
 * - Displays employee information card
 * - Shows quick action buttons for common tasks
 * - Handles loading states and error conditions
 * - Auto-fetches employee data on mount
 * - Prevents duplicate data fetches
 * 
 * @returns The rendered Dashboard page
 */
export const Dashboard: React.FC = () => {
    const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [isDataFetched, setIsDataFetched] = useState(false);

    /**
     * Effect hook to fetch employee data on component mount.
     * Only fetches data once and handles cleanup for unmounting.
     */
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (isDataFetched || !user) {
                setLoading(false);
                if (!user) {
                    setError('Please log in to view your dashboard');
                }
                return;
            }

            try {
                setLoading(true);
                const data = await getEmployeeInfo();
                
                if (isMounted) {
                    if (!data) {
                        setError('Unable to load employee information');
                    } else {
                        setEmployee(data);
                    }
                    setIsDataFetched(true);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error('Error fetching employee info:', err);
                    setError(err.response?.data?.error || 'Failed to load employee information');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [user, isDataFetched]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorAlert message={error} />;
    }

    if (!employee) {
        return (
            <Container>
                <Alert severity="warning" sx={{ mt: 2 }}>
                    No employee information found. Please contact your administrator.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 4, color: 'text.primary' }}>
            <Typography variant="h5" component="h1" gutterBottom textAlign="center" sx={{ color: 'text.primary' }}>
                Employee Dashboard
            </Typography>
            
            <Container maxWidth="lg" sx={{ color: 'text.primary' }}>
              <EmployeeInfoCard employee={employee} />
              <QuickActionsPanel />
            </Container>
        </Container>
    );
};

export default Dashboard;
