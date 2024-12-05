/**
 * @fileoverview Time entries filter component that provides a user interface for
 * filtering time entry data based on employee selection and date range. Features
 * a responsive design that adapts to different screen sizes.
 */

import React from 'react';
import {
    Box,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
} from '@mui/material';
import { Employee } from '../../types/employee';
import { FilterData } from '../../types/timeEntry';

/**
 * Props interface for the TimeEntriesFilter component.
 */
interface TimeEntriesFilterProps {
    /** Current filter state containing employee_id and date range */
    filterData: FilterData;
    /** Array of employees for the employee selection dropdown */
    employees: Employee[];
    /** Callback function to handle changes to individual filter fields */
    onFilterChange: (field: keyof FilterData, value: any) => void;
    /** Callback function to apply the current filter settings */
    onApplyFilter: () => void;
}

/**
 * TimeEntriesFilter component that provides filtering controls for time entries.
 * Features:
 * - Employee selection dropdown with "All Employees" option
 * - Date range selection (start and end dates)
 * - Responsive layout that stacks on mobile and aligns horizontally on desktop
 * - Consistent field widths and spacing
 * - Material-UI Paper container with padding
 * 
 * @param props - Component props
 * @param props.filterData - Current filter state
 * @param props.employees - Array of available employees
 * @param props.onFilterChange - Handler for filter field changes
 * @param props.onApplyFilter - Handler for applying the filter
 * @returns The time entries filter component
 */
export const TimeEntriesFilter: React.FC<TimeEntriesFilterProps> = ({
    filterData,
    employees,
    onFilterChange,
    onApplyFilter,
}) => {
    return (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: 'background.paper', color: 'text.primary' }}>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                '& .MuiFormControl-root': {
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: '200px' }
                },
                '& .MuiButton-root': {
                    width: { xs: '100%', sm: 'auto' },
                    mt: { xs: 1, sm: 0 },
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText'
                }
            }}>
                <FormControl>
                    <InputLabel id="employee-select-label">Employee</InputLabel>
                    <Select
                        labelId="employee-select-label"
                        value={filterData.employee_id}
                        label="Employee"
                        onChange={(e) => onFilterChange('employee_id', e.target.value)}
                    >
                        <MenuItem value="">All Employees</MenuItem>
                        {employees.map((employee) => (
                            <MenuItem key={employee.id} value={employee.employee_id}>
                                {employee.first_name} {employee.last_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    label="Start Date"
                    type="date"
                    value={filterData.start_date}
                    onChange={(e) => onFilterChange('start_date', e.target.value)}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <TextField
                    label="End Date"
                    type="date"
                    value={filterData.end_date}
                    onChange={(e) => onFilterChange('end_date', e.target.value)}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <Button
                    variant="contained"
                    onClick={onApplyFilter}
                >
                    Apply Filter
                </Button>
            </Box>
        </Paper>
    );
};
