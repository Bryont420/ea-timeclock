/**
 * @fileoverview Time entry dialog component that provides a modal interface for
 * creating and editing time entries. Supports both clock-in and clock-out times,
 * employee selection, and notes management with error handling.
 */

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Alert,
} from '@mui/material';
import { TimeEntry, FormData } from '../../types/timeEntry';
import { Employee } from '../../types/employee';
import { DialogLoadingOverlay } from '../common/DialogLoadingOverlay';

/**
 * Props interface for the TimeEntryDialog component.
 */
interface TimeEntryDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback function to close the dialog */
    onClose: () => void;
    /** Time entry being edited, or null for new entries */
    selectedEntry: TimeEntry | null;
    /** Form data containing all entry fields */
    formData: FormData;
    /** Callback function to handle form field changes */
    onFormChange: (field: keyof FormData, value: any) => void;
    /** Callback function to handle form submission */
    onSubmit: () => void;
    /** Error message to display, if any */
    error: string | null;
    /** Array of employees for the employee selection dropdown */
    employees: Employee[];
    /** Whether the form is currently submitting */
    submitting?: boolean;
}

/**
 * TimeEntryDialog component that provides a form dialog for time entries.
 * Features:
 * - Create and edit time entries
 * - Employee selection from dropdown
 * - DateTime inputs for clock-in and clock-out times
 * - Toggle for currently clocked-in status
 * - Notes field for additional information
 * - Form validation and error display
 * - Responsive layout with proper spacing
 * 
 * @param props - Component props
 * @param props.open - Dialog open state
 * @param props.onClose - Close handler
 * @param props.selectedEntry - Entry being edited
 * @param props.formData - Current form data
 * @param props.onFormChange - Form change handler
 * @param props.onSubmit - Submit handler
 * @param props.error - Error message
 * @param props.employees - Available employees
 * @param props.submitting - Whether the form is currently submitting
 * @returns The time entry dialog component
 */
export const TimeEntryDialog: React.FC<TimeEntryDialogProps> = ({
    open,
    onClose,
    selectedEntry,
    formData,
    onFormChange,
    onSubmit,
    error,
    employees,
    submitting = false,
}) => {
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth 
        >
            <DialogTitle sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
                {selectedEntry ? 'Edit Time Entry' : 'Add Time Entry'}
            </DialogTitle>
            <DialogContent sx={{ position: 'relative', minHeight: '300px', color: 'text.primary' }}>
                <DialogLoadingOverlay open={submitting} />
                {error && (
                    <Alert severity="error" sx={{ mb: 2, color: 'error.contrastText' }}>
                        {error}
                    </Alert>
                )}
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, color: 'text.primary' }}>
                    <FormControl fullWidth>
                        <InputLabel>Employee</InputLabel>
                        <Select
                            value={formData.employee_id}
                            label="Employee"
                            onChange={(e) => onFormChange('employee_id', e.target.value)}
                            required
                            disabled={submitting}
                        >
                            {employees.map((employee) => (
                                <MenuItem key={employee.id} value={employee.employee_id}>
                                    {`${employee.first_name} ${employee.last_name}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    <TextField
                        label="Clock In Time"
                        type="datetime-local"
                        value={formData.clock_in_time}
                        onChange={(e) => onFormChange('clock_in_time', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required
                        fullWidth
                        disabled={submitting}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formData.is_clocked_in}
                                onChange={(e) => onFormChange('is_clocked_in', e.target.checked)}
                                disabled={submitting}
                            />
                        }
                        label="Still Clocked In"
                        componentsProps={{ typography: { sx: { backgroundColor: 'transparent' } } }}
                    />

                    {!formData.is_clocked_in && (
                        <TextField
                            label="Clock Out Time"
                            type="datetime-local"
                            value={formData.clock_out_time}
                            onChange={(e) => onFormChange('clock_out_time', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            required
                            fullWidth
                            disabled={submitting}
                        />
                    )}

                    {/* Notes Section */}
                    {selectedEntry && (
                        <TextField
                            label="Previous Notes"
                            multiline
                            rows={2}
                            value={formData.notes}
                            InputProps={{
                                readOnly: true,
                            }}
                            fullWidth
                            disabled
                        />
                    )}

                    <TextField
                        label={selectedEntry ? "Add New Note" : "Notes"}
                        multiline
                        rows={4}
                        value={selectedEntry ? formData.new_note : formData.notes}
                        onChange={(e) => onFormChange(
                            selectedEntry ? 'new_note' : 'notes',
                            e.target.value
                        )}
                        fullWidth
                        required
                        disabled={submitting}
                        error={selectedEntry ? !formData.new_note : !formData.notes}
                        helperText={(selectedEntry ? !formData.new_note : !formData.notes) ? "Note is required" : ""}
                        placeholder={selectedEntry ? "Enter a new note for this edit" : "Enter notes"}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ color: 'text.primary' }}>
                <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button 
                    onClick={onSubmit} 
                    variant="contained" 
                    color="primary"
                    disabled={submitting}
                >
                    {selectedEntry ? 'Save Changes' : 'Add Entry'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
