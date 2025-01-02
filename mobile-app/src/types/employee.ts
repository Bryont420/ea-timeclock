/**
 * @fileoverview Employee type definitions for the application.
 * Contains interfaces related to employee data, including personal information,
 * time-off balances, and clock status.
 */

/**
 * Interface representing an employee in the system.
 * Includes personal information, employment details, and time-off balances.
 */
export interface Employee {
    /** Unique identifier for the employee */
    id: number;
    /** Employee's company ID number */
    employee_id: string;
    /** Employee's first name */
    first_name: string;
    /** Employee's last name */
    last_name: string;
    /** Date the employee was hired (ISO format) */
    hire_date: string;
    /** Number of years the employee has been with the company */
    years_employed: number;
    /** Total vacation hours allocated for the current period */
    vacation_hours_allocated: number;
    /** Vacation hours used in the current period */
    vacation_hours_used: number;
    /** Remaining vacation hours (formatted string) */
    vacation_hours_remaining: string;
    /** Total sick hours allocated for the current period */
    sick_hours_allocated: number;
    /** Sick hours used in the current period */
    sick_hours_used: number;
    /** Remaining sick hours (formatted string) */
    sick_hours_remaining: string;
    /** Formatted display of allocated vacation hours */
    vacation_hours_allocated_display: string;
    /** Formatted display of used vacation hours */
    vacation_hours_used_display: string;
    /** Formatted display of allocated sick hours */
    sick_hours_allocated_display: string;
    /** Formatted display of used sick hours */
    sick_hours_used_display: string;
    /** Current clock status (e.g., 'clocked_in', 'clocked_out') */
    clocked_status: string;
}
