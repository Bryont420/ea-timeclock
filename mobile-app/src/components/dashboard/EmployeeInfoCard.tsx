/**
 * @fileoverview Employee information card component that displays detailed employee
 * data including personal information and time-off balances. Features a clean,
 * organized layout with responsive grid for time-off information.
 */

import React from 'react';
import { 
    Typography, 
    Card,
    CardContent,
    Divider,
    Grid,
} from '@mui/material';
import { EmployeeInfo } from '../../services/employee';

/**
 * Props interface for the EmployeeInfoCard component.
 */
interface EmployeeInfoCardProps {
    /** Employee information object containing all relevant employee data */
    employee: EmployeeInfo;
}

/**
 * EmployeeInfoCard component that displays comprehensive employee information.
 * Features:
 * - Personal information display (name, ID, employment duration)
 * - Time-off information in a responsive grid layout
 * - Vacation and sick hours tracking
 * - Clear visual hierarchy with typography variants
 * - Consistent spacing and dividers
 * 
 * Layout sections:
 * 1. Employee basic information
 * 2. Vacation hours (allocated, used, remaining)
 * 3. Sick hours (allocated, used, remaining)
 * 
 * @param props - Component props
 * @param props.employee - Employee information object
 * @returns The employee information card component
 */
export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ employee }) => {
    return (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Employee Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                    <strong>Name:</strong> {employee.first_name} {employee.last_name}
                </Typography>
                <Typography variant="body1" gutterBottom>
                    <strong>Employee ID:</strong> {employee.employee_id}
                </Typography>
                <Typography variant="body1" gutterBottom>
                    <strong>Years Employed:</strong> {employee.years_employed.toFixed(1)}
                </Typography>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                            <strong>Vacation Hours</strong>
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            Allocated: {employee.vacation_hours_allocated_display}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            Used: {employee.vacation_hours_used_display}
                        </Typography>
                        <Typography variant="body2">
                            Remaining: {employee.vacation_hours_remaining_display}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                            <strong>Sick Hours</strong>
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            Allocated: {employee.sick_hours_allocated_display}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            Used: {employee.sick_hours_used_display}
                        </Typography>
                        <Typography variant="body2">
                            Remaining: {employee.sick_hours_remaining_display}
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default EmployeeInfoCard;
