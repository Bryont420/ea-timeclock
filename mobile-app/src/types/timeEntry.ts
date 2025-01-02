/**
 * @fileoverview Time entry type definitions for the application.
 * Contains interfaces for time entries, form data, and filtering options.
 * Handles clock in/out records, notes, and various time entry types
 * (regular, vacation, sick, holiday).
 */

/**
 * Interface representing a time entry record in the system.
 * Includes clock in/out times, hours worked, notes, and entry type.
 */
export interface TimeEntry {
    /** Unique identifier for the time entry */
    id: number;
    /** Name of the employee this entry belongs to */
    employee_name: string;
    /** Clock in timestamp (ISO format) */
    clock_in_time: string;
    /** Clock out timestamp (ISO format), null if still clocked in */
    clock_out_time: string | null;
    /** Date of the entry (ISO format) */
    entry_date: string;
    /** Formatted clock in time for display */
    clock_in_time_formatted: string;
    /** Formatted clock out time for display */
    clock_out_time_formatted: string;
    /** Formatted display of hours worked */
    hours_worked_display: string;
    /** Total hours for the entry period */
    total_hours: string;
    /** Array of notes attached to this entry */
    notes_display: {
        /** Unique identifier for the note */
        id: number;
        /** Content of the note */
        note_text: string;
        /** Username of who created the note */
        created_by: string;
        /** Timestamp when note was created */
        created_at: string;
    }[];
    /** Whether this is a vacation entry */
    is_vacation: boolean;
    /** Whether this is a sick leave entry */
    is_sick: boolean;
    /** Whether this is a holiday entry */
    is_holiday: boolean;
    /** Type of entry (e.g., 'regular', 'vacation', 'sick', 'holiday') */
    entry_type: string;
}

/**
 * Interface for time entry form data.
 * Used when creating or editing time entries.
 */
export interface FormData {
    /** Employee's ID number */
    employee_id: string;
    /** Clock in time (ISO format) */
    clock_in_time: string;
    /** Clock out time (ISO format) */
    clock_out_time: string;
    /** Existing notes for the entry */
    notes: string;
    /** New note to be added */
    new_note?: string;
    /** Whether employee is currently clocked in */
    is_clocked_in?: boolean;
}

/**
 * Interface for time entry filtering options.
 * Used to filter time entries by employee and date range.
 */
export interface FilterData {
    /** Employee ID to filter by */
    employee_id: string;
    /** Start date of the filter range */
    start_date: string;
    /** End date of the filter range */
    end_date: string;
}
