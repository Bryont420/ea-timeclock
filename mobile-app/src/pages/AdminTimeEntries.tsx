import React, { useState, useEffect, memo, useCallback } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { API_ENDPOINTS } from '../config';
import { generateTimeEntriesPDF } from '../utils/pdfUtils';
import { TimeEntry, FormData, FilterData } from '../types/timeEntry';
import { Employee } from '../types/employee';
import { TimeEntryDialog } from '../components/admin/TimeEntryDialog';
import { TimeEntriesTable } from '../components/admin/TimeEntriesTable';
import { TimeEntriesFilter } from '../components/admin/TimeEntriesFilter';
import { format, parseISO } from 'date-fns';

const getWorkWeekDates = () => {
    const today = new Date();
    
    // Find the most recent Thursday (if today is Thursday, use today)
    const thursday = new Date(today);
    const daysSinceThursday = (today.getDay() + 3) % 7; // Days since last Thursday
    thursday.setDate(today.getDate() - daysSinceThursday);
    
    // Get the next Wednesday
    const wednesday = new Date(thursday);
    wednesday.setDate(thursday.getDate() + 6);
    
    return {
        start: thursday.toISOString().split('T')[0],
        end: wednesday.toISOString().split('T')[0]
    };
};

const sortTimeEntries = (entries: TimeEntry[]): TimeEntry[] => {
    return [...entries].sort((a, b) => {
        // First separate clocked in vs not clocked in
        const aIsClockedIn = a.clock_out_time === null;
        const bIsClockedIn = b.clock_out_time === null;
        
        // If clocked-in status differs, clocked-in entries come first
        if (aIsClockedIn !== bIsClockedIn) {
            return aIsClockedIn ? -1 : 1;
        }

        // Split employee names into first and last name
        const [aFirst, aLast] = a.employee_name.split(' ').map(s => s.toLowerCase());
        const [bFirst, bLast] = b.employee_name.split(' ').map(s => s.toLowerCase());

        // Sort by last name
        if (aLast !== bLast) {
            return aLast.localeCompare(bLast);
        }

        // Then by first name
        if (aFirst !== bFirst) {
            return aFirst.localeCompare(bFirst);
        }

        // Finally, sort by time ascending
        return new Date(a.clock_in_time).getTime() - new Date(b.clock_in_time).getTime();
    });
};

const MemoizedTimeEntriesTable = memo(TimeEntriesTable);
const MemoizedTimeEntryDialog = memo(TimeEntryDialog);
const MemoizedTimeEntriesFilter = memo(TimeEntriesFilter);

export const AdminTimeEntries: React.FC = () => {
    const workWeek = getWorkWeekDates();
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        employee_id: '',
        clock_in_time: '',
        clock_out_time: '',
        notes: '',
        new_note: '',
        is_clocked_in: true
    });

    const [filterData, setFilterData] = useState<FilterData>({
        employee_id: '',
        start_date: workWeek.start,
        end_date: workWeek.end
    });

    const [appliedFilters, setAppliedFilters] = useState<FilterData>({
        employee_id: '',
        start_date: workWeek.start,
        end_date: workWeek.end
    });

    const { user } = useAuth();
    const { setRefreshTimeEntries } = useAdmin();

    const fetchTimeEntries = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                employee_id: appliedFilters.employee_id,
                start_date: appliedFilters.start_date,
                end_date: appliedFilters.end_date
            });

            const response = await axios.get(`${API_ENDPOINTS.ADMIN.TIME_ENTRIES}?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTimeEntries(sortTimeEntries(response.data));
        } catch (err) {
            setError('Failed to fetch time entries');
            console.error(err);
        }
    }, [appliedFilters]);

    const fetchEmployees = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.ADMIN.EMPLOYEES, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setEmployees(response.data);
        } catch (err) {
            setError('Failed to fetch employees');
            console.error(err);
        }
    };

    const fetchEmployeeStatus = async (employeeId: string): Promise<boolean> => {
        try {
            // Find the employee to get their numeric ID
            const employee = employees.find(emp => emp.employee_id === employeeId);
            if (!employee) {
                console.error('Could not find employee with ID:', employeeId);
                return false;
            }

            const response = await axios.get(`${API_ENDPOINTS.ADMIN.EMPLOYEES}${employee.id}/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return response.data.clocked_in;
        } catch (err) {
            console.error('Error fetching employee status:', err);
            return false;
        }
    };

    const updateEmployeeStatus = async (employeeId: string, isClocked: boolean) => {
        try {
            // Find the employee to get their numeric ID
            const employee = employees.find(emp => emp.employee_id === employeeId);
            if (!employee) {
                console.error('Could not find employee with ID:', employeeId);
                return;
            }

            await axios.patch(
                `${API_ENDPOINTS.ADMIN.EMPLOYEES}${employee.id}/`,
                { clocked_in: isClocked },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    }
                }
            );
        } catch (err) {
            console.error('Error updating employee status:', err);
        }
    };

    useEffect(() => {
        fetchTimeEntries();
    }, [appliedFilters, fetchTimeEntries]);

    useEffect(() => {
        fetchEmployees();
        
        if (setRefreshTimeEntries) {
            setRefreshTimeEntries(fetchTimeEntries);
        }
    }, [setRefreshTimeEntries, fetchTimeEntries]);

    const handleFilterChange = (field: keyof FilterData, value: any) => {
        setFilterData(prev => ({ ...prev, [field]: value }));
    };

    const handleApplyFilter = () => {
        setAppliedFilters(filterData);
    };

    const handleFormChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleEdit = (entry: TimeEntry) => {
        // Find the employee by matching the name
        const employee = employees.find(emp => 
            `${emp.first_name} ${emp.last_name}` === entry.employee_name
        );

        if (!employee) {
            console.error('Could not find matching employee for:', entry.employee_name);
            setError('Could not find matching employee');
            return;
        }

        // Get the latest note if available
        const latestNote = entry.notes_display.length > 0 
            ? entry.notes_display[0].note_text 
            : '';

        setSelectedEntry(entry);
        setFormData({
            employee_id: employee.employee_id,
            clock_in_time: format(parseISO(entry.clock_in_time), "yyyy-MM-dd'T'HH:mm"),
            clock_out_time: entry.clock_out_time 
                ? format(parseISO(entry.clock_out_time), "yyyy-MM-dd'T'HH:mm")
                : '',
            notes: latestNote,
            new_note: '',
            is_clocked_in: !entry.clock_out_time
        });
        setOpenDialog(true);
    };

    const handleDelete = async (entry: TimeEntry) => {
        if (window.confirm('Are you sure you want to delete this time entry?')) {
            try {
                await axios.delete(`${API_ENDPOINTS.ADMIN.TIME_ENTRIES}${entry.id}/`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                fetchTimeEntries();
            } catch (err) {
                setError('Failed to delete time entry');
                console.error(err);
            }
        }
    };

    const handleSubmit = async () => {
        try {
            if (selectedEntry) {
                // For editing
                const payload = {
                    employee_id: formData.employee_id,
                    clock_in_time: formData.clock_in_time,
                    clock_out_time: formData.is_clocked_in ? null : formData.clock_out_time,
                    notes: [{
                        note_text: formData.new_note || '',
                        created_by: user?.username || ''
                    }]
                };

                await axios.put(
                    `${API_ENDPOINTS.ADMIN.TIME_ENTRIES}${selectedEntry.id}/`,
                    payload,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
            } else {
                // For creating new entry
                const payload = {
                    employee_id: formData.employee_id,
                    clock_in_time: formData.clock_in_time,
                    clock_out_time: formData.is_clocked_in ? null : formData.clock_out_time,
                    notes: [{
                        note_text: formData.notes || '',
                        created_by: user?.username || ''
                    }]
                };

                await axios.post(
                    API_ENDPOINTS.ADMIN.TIME_ENTRIES,
                    payload,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
            }

            // Update employee status if needed
            const currentStatus = await fetchEmployeeStatus(formData.employee_id);
            if (currentStatus !== formData.is_clocked_in) {
                await updateEmployeeStatus(formData.employee_id, formData.is_clocked_in || false);
            }

            setOpenDialog(false);
            setSelectedEntry(null);
            setFormData({
                employee_id: '',
                clock_in_time: '',
                clock_out_time: '',
                notes: '',
                is_clocked_in: true
            });
            fetchTimeEntries();
        } catch (err) {
            setError('Failed to save time entry');
            console.error(err);
        }
    };

    return (
        <Container maxWidth="xl">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Time Entries
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                    >
                        Add Entry
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => generateTimeEntriesPDF(timeEntries)}
                    >
                        Export PDF
                    </Button>
                </Box>

                <MemoizedTimeEntriesFilter
                    filterData={filterData}
                    employees={employees}
                    onFilterChange={handleFilterChange}
                    onApplyFilter={handleApplyFilter}
                />

                <MemoizedTimeEntriesTable
                    timeEntries={timeEntries}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                <MemoizedTimeEntryDialog
                    open={openDialog}
                    onClose={() => {
                        setOpenDialog(false);
                        setSelectedEntry(null);
                        setFormData({
                            employee_id: '',
                            clock_in_time: '',
                            clock_out_time: '',
                            notes: '',
                            is_clocked_in: true
                        });
                        setError(null);
                    }}
                    selectedEntry={selectedEntry}
                    formData={formData}
                    onFormChange={handleFormChange}
                    onSubmit={handleSubmit}
                    error={error}
                    employees={employees}
                />
            </Box>
        </Container>
    );
};