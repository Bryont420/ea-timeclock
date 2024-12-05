/**
 * @fileoverview Employee statistics card component that displays detailed information
 * about an individual employee, including their personal details, employment status,
 * and time off balances in a visually appealing card format.
 */

import React, { memo } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    styled,
} from '@mui/material';
import { Employee } from '../../types/employee';

/**
 * Styled Card component with consistent height and background color.
 * Uses theme-based styling for better integration with the application's design system.
 */
const StyledCard = styled(Card)(({ theme }) => ({
    height: '100%',
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    '& .MuiCardContent-root': {
        '& .MuiTypography-root:not(.employee-header)': {
            backgroundColor: theme.palette.action.hover,
            padding: theme.spacing(1),
            borderRadius: theme.shape.borderRadius,
        }
    },
    '& .MuiChip-root': {
        color: theme.palette.secondary.main,
        '&.MuiChip-colorSuccess': {
            backgroundColor: theme.palette.success.light,
            color: theme.palette.success.contrastText,
        },
        '&.MuiChip-colorPrimary': {
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.success.contrastText,
        }
    }
}));

/**
 * Props interface for the EmployeeStatsCard component.
 */
interface EmployeeStatsCardProps {
    /** Employee object containing all relevant employee information */
    employee: Employee;
}

/**
 * EmployeeStatsCard component that displays comprehensive employee information.
 * Features:
 * - Personal information display (name, ID)
 * - Current clock status with color-coded indicator
 * - Employment duration
 * - Detailed time off balances (vacation and sick hours)
 * - Responsive layout with consistent spacing
 * 
 * @param props - Component props
 * @param props.employee - Employee object containing all employee data
 * @returns The employee statistics card component
 */
export const EmployeeStatsCard: React.FC<EmployeeStatsCardProps> = memo(({ employee }) => {
    return (
        <StyledCard>
            <CardContent>
                <Typography variant="h6" gutterBottom className="employee-header">
                    {employee.first_name} {employee.last_name}
                </Typography>
                <Typography color="textSecondary" gutterBottom className="employee-header">
                    ID: {employee.employee_id}
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom className="employee-header">
                        Employment Status
                    </Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        mb: 2,
                        flexWrap: 'wrap'
                    }}>
                        <Chip
                            label={employee.clocked_status}
                            color={employee.clocked_status === 'Clocked In' ? 'success' : 'primary'}
                            size="small"
                        />
                        <Chip
                            label={`${employee.years_employed} years`}
                            variant="outlined"
                            color="secondary"
                            size="small"
                        />
                    </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom className="employee-header">
                        Time Off Balance
                    </Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 1 
                    }}>
                        <Box sx={{ 
                            p: 1.5, 
                            borderRadius: 1,
                            bgcolor: 'background.paper'
                        }}>
                            <Typography variant="body2" color="textSecondary" className="employee-header">
                                Vacation Hours:
                            </Typography>
                            <Typography>
                                {employee.vacation_hours_remaining} remaining
                                ({employee.vacation_hours_used_display} used)
                            </Typography>
                        </Box>
                        <Box sx={{ 
                            p: 1.5, 
                            borderRadius: 1,
                            bgcolor: 'background.paper'
                        }}>
                            <Typography variant="body2" color="textSecondary" className="employee-header">
                                Sick Hours:
                            </Typography>
                            <Typography>
                                {employee.sick_hours_remaining} remaining
                                ({employee.sick_hours_used_display} used)
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </StyledCard>
    );
});
