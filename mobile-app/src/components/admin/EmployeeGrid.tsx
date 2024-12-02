/**
 * @fileoverview Grid component that displays a collection of employee statistics cards
 * in a responsive layout. Used in the admin dashboard to show employee information
 * in an organized grid format.
 */

import React from 'react';
import { Grid } from '@mui/material';
import { Employee } from '../../types/employee';
import { EmployeeStatsCard } from './EmployeeStatsCard';

/**
 * Props interface for the EmployeeGrid component.
 */
interface EmployeeGridProps {
    /** Array of employee objects to display in the grid */
    employees: Employee[];
}

/**
 * EmployeeGrid component that renders a responsive grid of employee statistics cards.
 * Features:
 * - Responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)
 * - Automatic grid spacing and alignment
 * - Memoized to prevent unnecessary re-renders
 * 
 * @param props - Component props
 * @param props.employees - Array of employees to display in the grid
 * @returns The employee grid component
 */
export const EmployeeGrid: React.FC<EmployeeGridProps> = React.memo(({ employees }) => {
    return (
        <Grid container spacing={3}>
            {employees.map((employee) => (
                <Grid item xs={12} sm={6} md={4} key={employee.id}>
                    <EmployeeStatsCard employee={employee} />
                </Grid>
            ))}
        </Grid>
    );
});
/** testing notes being pushed */