export interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    hire_date: string;
    years_employed: number;
    vacation_hours_allocated: number;
    vacation_hours_used: number;
    vacation_hours_remaining: string;
    sick_hours_allocated: number;
    sick_hours_used: number;
    sick_hours_remaining: string;
    vacation_hours_allocated_display: string;
    vacation_hours_used_display: string;
    sick_hours_allocated_display: string;
    sick_hours_used_display: string;
    clocked_status: string;
}
