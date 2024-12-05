/**
 * @fileoverview Time entries table component that displays employee time entries
 * in a responsive table format. Provides functionality for viewing, editing, and
 * deleting time entries with mobile-optimized display options.
 */

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Box,
    useMediaQuery,
    Typography,
    Card,
    CardContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { TimeEntry } from '../../types/timeEntry';
import { format, parseISO } from 'date-fns';

/**
 * Props interface for the TimeEntriesTable component.
 */
interface TimeEntriesTableProps {
    /** Array of time entries to display in the table */
    timeEntries: TimeEntry[];
    /** Callback function for handling edit actions */
    onEdit: (entry: TimeEntry) => void;
    /** Callback function for handling delete actions */
    onDelete: (entry: TimeEntry) => void;
}

/**
 * TimeEntriesTable component that displays time entries in a responsive table.
 * Features:
 * - Responsive table layout with horizontal scrolling on mobile
 * - Mobile-optimized view that hides less important columns
 * - Formatted date and time display
 * - Visual indicator for currently clocked-in entries
 * - Notes display with author and timestamp
 * - Edit and delete actions for each entry
 * - Consistent spacing and typography
 * 
 * @param props - Component props
 * @param props.timeEntries - Array of time entries to display
 * @param props.onEdit - Handler for edit actions
 * @param props.onDelete - Handler for delete actions
 * @returns The time entries table component
 */
export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = ({
    timeEntries,
    onEdit,
    onDelete,
}) => {
    const isMobile = useMediaQuery('(max-width:600px)');

    return (
        <Box sx={{ mb: 3 }}>
            {isMobile ? (
                <Box>
                    {timeEntries.map((entry) => (
                        <Card key={entry.id} sx={{ mb: 2 }}>
                            <CardContent sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
                                <Typography variant="h6">{entry.employee_name}</Typography>
                                <Typography variant="body2">
                                    Date: {format(parseISO(entry.entry_date), 'EEE MM/dd/yy')}
                                </Typography>
                                <Typography variant="body2">
                                    Clock In: {entry.clock_in_time_formatted}
                                </Typography>
                                <Typography variant="body2">
                                    Clock Out: {entry.clock_out_time_formatted || (
                                        <Chip 
                                            label="Clocked In"
                                            sx={{ 
                                                backgroundColor: (theme) => theme.palette.success.main, 
                                                color: (theme) => theme.palette.success.contrastText 
                                            }}
                                            size="small"
                                        />
                                    )}
                                </Typography>
                                <Typography variant="body2">
                                    Hours: {entry.hours_worked_display}
                                </Typography>
                                <Typography variant="body2">
                                    Notes: {entry.notes_display?.map((note) => (
                                        <div key={note.id}>
                                            <small>{note.note_text}</small>
                                            <br />
                                            <small style={{ color: 'text.secondary' }}>
                                                {note.created_by} - {new Date(note.created_at).toLocaleDateString()}
                                            </small>
                                        </div>
                                    ))}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <IconButton onClick={() => onEdit(entry)} sx={{ color: 'primary.main' }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton onClick={() => onDelete(entry)} sx={{ color: 'error.main' }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <TableContainer 
                    component={Paper}
                    sx={{
                        overflowX: 'auto',
                        backgroundColor: 'background.paper',
                        boxShadow: 'none',
                        '& .MuiTable-root': {
                            minWidth: 650,
                        },
                        '& .MuiTableCell-root': {
                            whiteSpace: 'nowrap',
                            padding: { xs: 0.5, sm: 2 },
                            '&.notes-cell': {
                                whiteSpace: 'normal',
                                minWidth: '150px'
                            }
                        },
                        '& .hide-on-mobile': {
                            display: { xs: 'none', sm: 'table-cell' }
                        }
                    }}
                >
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Employee</TableCell>
                                <TableCell>Clock In</TableCell>
                                <TableCell>Clock Out</TableCell>
                                <TableCell className="hide-on-mobile">Hours</TableCell>
                                <TableCell className="notes-cell hide-on-mobile">Notes</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {timeEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(parseISO(entry.entry_date), 'EEE MM/dd/yy')}</TableCell>
                                    <TableCell>{entry.employee_name}</TableCell>
                                    <TableCell>{entry.clock_in_time_formatted}</TableCell>
                                    <TableCell>{entry.clock_out_time_formatted || (
                                        <Chip 
                                            label="Clocked In"
                                            sx={{ 
                                                backgroundColor: (theme) => theme.palette.success.main, 
                                                color: (theme) => theme.palette.success.contrastText 
                                            }}
                                            size="small"
                                        />
                                    )}</TableCell>
                                    <TableCell className="hide-on-mobile">{entry.hours_worked_display}</TableCell>
                                    <TableCell className="notes-cell hide-on-mobile">
                                        {entry.notes_display?.map((note) => (
                                            <div key={note.id}>
                                                <small>{note.note_text}</small>
                                                <br />
                                                <small style={{ color: 'text.secondary' }}>
                                                    {note.created_by} - {new Date(note.created_at).toLocaleDateString()}
                                                </small>
                                            </div>
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => onEdit(entry)} sx={{ color: 'primary.main' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton onClick={() => onDelete(entry)} sx={{ color: 'error.main' }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default TimeEntriesTable;
