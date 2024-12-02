import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { createTimeOffRequest, updateTimeOffRequest, TimeOffRequest, CreateTimeOffRequest } from '../../services/timeoff';

const isDateBlackedOut = (date: Date | null): boolean => {
  if (!date) return false;
  const month = date.getMonth(); // 0-based (0 = January)
  const day = date.getDate();
  
  // Blackout period: February 1st through June 9th
  return (month === 1 && day >= 1) || // February
         (month >= 2 && month <= 4) || // March through May
         (month === 5 && day <= 9); // June 1-9
};

export const TimeOffRequestForm: React.FC<{
  onSubmit: () => void;
  onClose: () => void;
  initialRequest?: TimeOffRequest;
  isDialog?: boolean;
}> = ({
  onSubmit,
  onClose,
  initialRequest,
  isDialog = false,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(
    initialRequest ? parseISO(initialRequest.start_date) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    initialRequest ? parseISO(initialRequest.end_date) : null
  );
  const [isPartialDay, setIsPartialDay] = useState(initialRequest?.is_partial_day || false);
  const [startTime, setStartTime] = useState<Date | null>(
    initialRequest?.start_time ? parseISO(`2000-01-01T${initialRequest.start_time}`) : null
  );
  const [endTime, setEndTime] = useState<Date | null>(
    initialRequest?.end_time ? parseISO(`2000-01-01T${initialRequest.end_time}`) : null
  );
  const [requestType, setRequestType] = useState<'vacation' | 'sick' | 'unpaid'>(
    initialRequest ? initialRequest.request_type : 'vacation'
  );
  const [reason, setReason] = useState(initialRequest?.reason || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateHours = (start: Date, end: Date, isPartial: boolean = false) => {
    if (isPartial) {
      // For partial day, calculate hours between start and end time
      const diffMinutes = differenceInMinutes(end, start);
      return Math.round((diffMinutes / 60) * 100) / 100; // Round to 2 decimal places
    } else {
      // For full days, calculate each day's hours based on the work week schedule
      let totalHours = 0;
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          if (currentDate.getDay() === 5) { // Friday
            totalHours += 4; // 4 hours on Friday
          } else { // Monday through Thursday
            totalHours += 9; // 9 hours per day
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return totalHours;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    try {
      if (isPartialDay) {
        if (!startDate) throw new Error('Please select a date');
        if (!startTime || !endTime) throw new Error('Please select both start and end times');
        
        const startDateTime = new Date(startDate);
        startDateTime.setHours(startTime.getHours(), startTime.getMinutes());
        const endDateTime = new Date(startDate);
        endDateTime.setHours(endTime.getHours(), endTime.getMinutes());
        
        if (endDateTime <= startDateTime) throw new Error('End time must be after start time');
      } else {
        if (!startDate || !endDate) throw new Error('Please select both start and end dates');
        if (endDate < startDate) throw new Error('End date must be after start date');
      }

      if (!reason.trim()) throw new Error('Please provide a reason for your time-off request');

      const hours = isPartialDay && startTime && endTime
        ? calculateHours(startTime, endTime, true)
        : startDate && endDate
          ? calculateHours(startDate, endDate)
          : 0;

      if (hours <= 0) throw new Error('Invalid time range selected');

      const request: CreateTimeOffRequest = {
        start_date: format(startDate!, 'yyyy-MM-dd'),
        end_date: isPartialDay ? format(startDate!, 'yyyy-MM-dd') : format(endDate!, 'yyyy-MM-dd'),
        hours_requested: hours,
        request_type: requestType,
        reason: reason.trim(),
        is_partial_day: isPartialDay,
        start_time: isPartialDay ? format(startTime!, 'HH:mm') : undefined,
        end_time: isPartialDay ? format(endTime!, 'HH:mm') : undefined,
      };

      setIsSubmitting(true);
      setError('');
      setSuccess(false);

      if (initialRequest) {
        await updateTimeOffRequest(initialRequest.id, request);
      } else {
        await createTimeOffRequest(request);
      }

      setSuccess(true);
      if (onSubmit) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSuccess(false);
        onSubmit();
      }
    } catch (err) {
      setSuccess(false);
      
      if (err instanceof Error) {
        // Check for API error response
        const apiError = err as any;
        if (apiError.response?.data) {
          // If it's a validation error with non_field_errors
          if (apiError.response.data.non_field_errors) {
            setError(apiError.response.data.non_field_errors[0]);
          }
          // If it's our custom error format
          else if (apiError.response.data.message) {
            setError(apiError.response.data.message);
          }
          // If it's a plain error message
          else if (typeof apiError.response.data === 'string') {
            setError(apiError.response.data);
          }
          // If it's some other error format
          else {
            setError(apiError.message);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {success && !error && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setSuccess(false)}
        >
          Time off request submitted successfully!
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isPartialDay}
                onChange={(e) => {
                  setIsPartialDay(e.target.checked);
                  if (e.target.checked) {
                    setEndDate(startDate);
                  }
                  setError('');
                }}
              />
            }
            label="Partial Day Request"
          />
        </Grid>

        {isPartialDay ? (
          <>
            <Grid item xs={12}>
              <DatePicker
                label="Date"
                value={startDate}
                onChange={(newValue) => {
                  if (newValue) {
                    const date = new Date(newValue);
                    date.setHours(0, 0, 0, 0);
                    setStartDate(date);
                    setEndDate(date);
                  } else {
                    setStartDate(null);
                    setEndDate(null);
                  }
                  setError('');
                }}
                shouldDisableDate={isDateBlackedOut}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!error && !startDate,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={(newValue) => {
                  setStartTime(newValue);
                  setError('');
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!error && !startTime,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={(newValue) => {
                  setEndTime(newValue);
                  setError('');
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!error && !endTime,
                  },
                }}
              />
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => {
                  if (newValue) {
                    const date = new Date(newValue);
                    date.setHours(0, 0, 0, 0);
                    setStartDate(date);
                    // If end date is null or before start date, set it to start date
                    if (!endDate || endDate < date) {
                      setEndDate(date);
                    }
                  } else {
                    setStartDate(null);
                  }
                  setError('');
                }}
                shouldDisableDate={isDateBlackedOut}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!error && !startDate,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => {
                  if (newValue) {
                    const date = new Date(newValue);
                    date.setHours(0, 0, 0, 0);
                    setEndDate(date);
                  } else {
                    setEndDate(null);
                  }
                  setError('');
                }}
                shouldDisableDate={isDateBlackedOut}
                minDate={startDate || undefined}
                defaultValue={startDate || undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!error && !endDate,
                  },
                }}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <FormControl fullWidth required>
            <InputLabel>Request Type</InputLabel>
            <Select
              value={requestType}
              label="Request Type"
              onChange={(e) => setRequestType(e.target.value as 'vacation' | 'sick' | 'unpaid')}
            >
              <MenuItem value="vacation">Vacation</MenuItem>
              <MenuItem value="sick">Sick Leave</MenuItem>
              <MenuItem value="unpaid">Unpaid Leave</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={4}
            required
            error={!!error && !reason.trim()}
            helperText={!!error && !reason.trim() ? 'Please provide a reason' : ''}
          />
        </Grid>

        {startDate && (isPartialDay ? startTime && endTime : endDate) && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              {isPartialDay ? (
                <>
                  Selected time: {format(startDate, 'MMM d, yyyy')} from{' '}
                  {format(startTime!, 'h:mm a')} to {format(endTime!, 'h:mm a')}
                </>
              ) : (
                <>
                  Selected dates: {format(startDate, 'MMM d, yyyy')} -{' '}
                  {format(endDate!, 'MMM d, yyyy')}
                </>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Requesting{' '}
              {isPartialDay
                ? calculateHours(startTime!, endTime!, true)
                : calculateHours(startDate, endDate!)}{' '}
              hours of time off
            </Typography>
          </Grid>
        )}
      </Grid>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {isDialog && (
          <Button 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Submitting...' : initialRequest ? 'Update Request' : 'Submit Request'}
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {isDialog ? (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {initialRequest ? 'Edit Time Off Request' : 'New Time Off Request'}
          </DialogTitle>
          <DialogContent>
            {formContent}
          </DialogContent>
        </Dialog>
      ) : (
        formContent
      )}

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Time off request submitted successfully!
        </Alert>
      </Snackbar>
    </>
  );
};

export default TimeOffRequestForm;
