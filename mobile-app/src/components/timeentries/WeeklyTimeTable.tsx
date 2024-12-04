/**
 * @fileoverview Weekly time table component that displays time entries in a
 * responsive table format. Features styled cells, date/time formatting, and
 * support for notes display. Uses Material-UI components with custom styling
 * for optimal display across different screen sizes.
 */

import React, { memo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableFooter,
    Paper,
    styled,
    Box,
    useMediaQuery,
    Typography,
    Card,
    CardContent,
    useTheme
} from '@mui/material';
import { TimeEntry } from '../../services/employee';
import { format, parseISO } from 'date-fns';

/**
 * Styled table cell component with responsive padding and font size.
 */
const StyledTableCell = styled(TableCell)(({ theme }) => ({
    padding: '10px',
    border: '1px solid black',
    whiteSpace: 'nowrap',
    [theme.breakpoints.down('sm')]: {
        padding: '8px',
        fontSize: '0.875rem',
    }
}));

/**
 * Styled header cell component with primary color background.
 */
const StyledTableHeaderCell = styled(TableCell)(({ theme }) => ({
    padding: '10px',
    border: '1px solid black',
    fontWeight: 'bold',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    whiteSpace: 'nowrap',
    [theme.breakpoints.down('sm')]: {
        padding: '8px',
        fontSize: '0.875rem',
    }
}));

/**
 * Styled total row component with hover background color.
 */
const StyledTotalRow = styled(TableRow)(({ theme }) => ({
    backgroundColor: theme.palette.action.hover,
}));

/**
 * Props interface for the WeeklyTimeTable component.
 */
interface WeeklyTimeTableProps {
    /** Array of time entries to display */
    entries: TimeEntry[];
    /** Start date of the current week */
    weekStart: Date;
    /** Total hours worked in the week, formatted as a string */
    totalHours: string;
}

/**
 * WeeklyTimeTable component that displays time entries in a tabular format.
 * Features:
 * - Responsive table layout with horizontal scrolling
 * - Formatted date and time display
 * - Support for currently clocked-in entries
 * - Notes display with author and timestamp
 * - Weekly total hours summary
 * - Custom styled cells and headers
 * 
 * Table Columns:
 * 1. Date - Entry date in MM/dd/yyyy format
 * 2. Clock In - Clock in time in hh:mm AM/PM format
 * 3. Clock Out - Clock out time or "Clocked In" status
 * 4. Hours - Hours worked for the entry
 * 5. Notes - Entry notes with author and timestamp
 * 
 * @param props - Component props
 * @param props.entries - Array of time entries
 * @param props.weekStart - Start date of the week
 * @param props.totalHours - Total hours worked
 * @returns The weekly time table component
 */
export const WeeklyTimeTable: React.FC<WeeklyTimeTableProps> = memo(({
    entries,
    weekStart,
    totalHours,
}) => {

    const isMobile = useMediaQuery('(max-width:600px)');
    const theme = useTheme();

    return (
        <Box>
            {isMobile ? (
                <Box>
                    {entries.map((entry) => (
                        <Card key={entry.id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h6">Date: {format(parseISO(entry.clock_in_time), 'EEE MM/dd/yyyy')}</Typography>
                                <Typography variant="body2">Clock In: {format(parseISO(entry.clock_in_time), 'hh:mm a')}</Typography>
                                <Typography variant="body2">Clock Out: {entry.clock_out_time ? format(parseISO(entry.clock_out_time), 'hh:mm a') : 'Clocked In'}</Typography>
                                <Typography variant="body2">Hours: {entry.hours_worked_display}</Typography>
                                <Typography variant="body2">Notes:</Typography>
                                {entry.notes?.map((note, index) => (
                                    <Typography key={index} variant="body2" sx={{ ml: 2, color: theme.palette.primary.main }}>
                                        - {note.note_text} ({note.created_by.username}, {format(parseISO(note.created_at), 'MM/dd/yyyy')})
                                    </Typography>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <StyledTableHeaderCell>Date</StyledTableHeaderCell>
                                <StyledTableHeaderCell>Clock In</StyledTableHeaderCell>
                                <StyledTableHeaderCell>Clock Out</StyledTableHeaderCell>
                                <StyledTableHeaderCell>Hours</StyledTableHeaderCell>
                                <StyledTableHeaderCell>Notes</StyledTableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <StyledTableCell>{format(parseISO(entry.clock_in_time), 'EEE MM/dd/yyyy')}</StyledTableCell>
                                    <StyledTableCell>{format(parseISO(entry.clock_in_time), 'hh:mm a')}</StyledTableCell>
                                    <StyledTableCell>{entry.clock_out_time ? format(parseISO(entry.clock_out_time), 'hh:mm a') : 'Clocked In'}</StyledTableCell>
                                    <StyledTableCell>{entry.hours_worked_display}</StyledTableCell>
                                    <StyledTableCell sx={{ whiteSpace: 'normal', minWidth: '200px' }}>
                                        {entry.notes?.map((note, index) => (
                                            <div key={index}>
                                                <small>{note.note_text}</small>
                                                <br />
                                                <small style={{ color: theme.palette.primary.main }}>
                                                    - {note.created_by.username} ({format(parseISO(note.created_at), 'MM/dd/yyyy')})
                                                </small>
                                            </div>
                                        ))}
                                    </StyledTableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <StyledTotalRow>
                                <StyledTableCell colSpan={3} align="right">
                                    <strong>Total Hours:</strong>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <strong>{totalHours}</strong>
                                </StyledTableCell>
                                <StyledTableCell />
                            </StyledTotalRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
});

export default WeeklyTimeTable;
