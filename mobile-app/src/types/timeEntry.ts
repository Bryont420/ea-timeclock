export interface TimeEntry {
    id: number;
    employee_name: string;
    clock_in_time: string;
    clock_out_time: string | null;
    entry_date: string;
    clock_in_time_formatted: string;
    clock_out_time_formatted: string;
    hours_worked_display: string;
    total_hours: string;
    notes_display: {
        id: number;
        note_text: string;
        created_by: string;
        created_at: string;
    }[];
    is_vacation: boolean;
    is_sick: boolean;
    is_holiday: boolean;
    entry_type: string;
}

export interface FormData {
    employee_id: string;
    clock_in_time: string;
    clock_out_time: string;
    notes: string;
    new_note?: string;
    is_clocked_in?: boolean;
}

export interface FilterData {
    employee_id: string;
    start_date: string;
    end_date: string;
}
