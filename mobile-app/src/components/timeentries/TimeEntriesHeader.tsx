/**
 * @fileoverview Time entries header component that displays the current week's
 * date range and total hours worked. Uses date-fns for consistent date formatting
 * and handles timezone considerations.
 */

import React, { memo } from 'react';
import {
    Typography,
    Box,
    Divider,
    useTheme
} from '@mui/material';
import { format } from 'date-fns';

/**
 * Props interface for the TimeEntriesHeader component.
 */
interface TimeEntriesHeaderProps {
    /** Start date of the current week */
    weekStart: Date;
    /** Total hours worked in the current week, formatted as a string */
    weekTotalHours: string;
}

/**
 * TimeEntriesHeader component that displays weekly time entry information.
 * Features:
 * - Week date range display (e.g., "Week of Jan 1 - Jan 7")
 * - Total hours worked in the week
 * - Consistent typography hierarchy
 * - Clear visual separation with divider
 * 
 * Note: Dates are handled using local components to avoid timezone issues
 * when displaying the week range.
 * 
 * @param props - Component props
 * @param props.weekStart - Start date of the week
 * @param props.weekTotalHours - Total hours worked
 * @returns The time entries header component
 */
export const TimeEntriesHeader: React.FC<TimeEntriesHeaderProps> = memo((
    {
        weekStart,
        weekTotalHours,
    }
) => {
    const theme = useTheme();
    const backgroundColor = theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)';

    // Create dates using local components to avoid timezone issues
    const startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom>
                Time Entries
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom sx={{ backgroundColor, padding: '8px 16px', borderRadius: '4px' }}>
                Week of {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
            </Typography>
            <Typography variant="subtitle1" gutterBottom sx={{ backgroundColor, padding: '8px 16px', borderRadius: '4px' }}>
                <strong>Total Hours This Week:</strong> {weekTotalHours}
            </Typography>
            <Divider sx={{ mt: 2 }} />
        </Box>
    );
});

export default TimeEntriesHeader;
