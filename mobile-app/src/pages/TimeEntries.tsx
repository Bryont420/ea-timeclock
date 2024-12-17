import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Card, CardContent } from '@mui/material';
import { getTimeEntries, TimeEntriesResponse, TimeEntry } from '../services/employee';
import { useAuth } from '../contexts/AuthContext';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import TimeEntriesHeader from '../components/timeentries/TimeEntriesHeader';
import { format, parseISO, startOfWeek } from 'date-fns';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

interface WeeklyEntries {
  weekStart: Date;
  entries: TimeEntry[];
  totalHours: string;
}

const MemoizedTimeEntriesHeader = React.memo(TimeEntriesHeader);

export const TimeEntries: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntries[]>([]);
  const { user } = useAuth();

  const calculateTotalHours = useCallback((entries: TimeEntry[]): string => {
    const totalMinutes = entries.reduce((sum, entry) => {
      if (!entry.hours_worked) return sum;
      return sum + Math.round(entry.hours_worked * 60);
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}H ${minutes}M`;
  }, []);

  const groupEntriesByWeek = useCallback((entries: TimeEntry[], weeklyTotals: { [key: string]: string }): WeeklyEntries[] => {
    const weeks: { [key: string]: TimeEntry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.clock_in_time);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Start week on Sunday
      const weekKey = weekStart.toISOString();
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(entry);
    });

    return Object.entries(weeks)
      .map(([weekKey, weekEntries]) => {
        const weekStart = new Date(weekKey);
        const totalHours = weeklyTotals[weekKey] || calculateTotalHours(weekEntries);
        
        return {
          weekStart,
          entries: weekEntries.sort((a, b) => 
            new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime()
          ),
          totalHours
        };
      })
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [calculateTotalHours]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!user) {
      setError('Please log in to view time entries');
      setLoading(false);
      return;
    }

    try {
      const data = await getTimeEntries();
      setTimeEntries(data);
      
      if (data.entries && data.entries.length > 0) {
        const grouped = groupEntriesByWeek(data.entries, data.weekly_totals);
        setWeeklyEntries(grouped);
      }
    } catch (err) {
      console.error('[DEBUG] Error fetching time entries:', err);
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [user, groupEntriesByWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!timeEntries || !timeEntries.entries || timeEntries.entries.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ color: 'text.primary', py: 4 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 2
          }}
        >
          <Typography variant="h5" gutterBottom color="text.primary">
            No Time Entries Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You haven't clocked in or out yet this month.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once you start using the time clock, your entries will appear here.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ color: 'text.primary', py: 4 }}>
      <LoadingOverlay open={loading} />
      <Typography variant="h5" component="h1" gutterBottom>
        Time Entries
      </Typography>
      {weeklyEntries.map((week) => (
        <Card key={week.weekStart.toISOString()} sx={{ mb: 4, boxShadow: 'none' }}>
          <CardContent>
            <MemoizedTimeEntriesHeader 
              weekStart={week.weekStart}
              weekTotalHours={week.totalHours}
            />
            {week.entries.map((entry) => (
              <Card key={entry.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6">Date: {format(parseISO(entry.clock_in_time), 'EEE MM/dd/yy')}</Typography>
                  <Typography variant="body2">Clock In: {format(parseISO(entry.clock_in_time), 'hh:mm a')}</Typography>
                  <Typography variant="body2">Clock Out: {entry.clock_out_time ? format(parseISO(entry.clock_out_time), 'hh:mm a') : 'N/A'}</Typography>
                  <Typography variant="body2">Hours: {entry.hours_worked}H</Typography>
                  <Typography variant="body2">Notes:</Typography>
                  {entry.notes && entry.notes.map((note, index) => (
                    <Typography key={index} variant="body2">
                      - {note.note_text} 
                      {note.created_by && ` (${note.created_by.username}, ${format(parseISO(note.created_at), 'MM/dd/yyyy')})`}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ))}
    </Container>
  );
};
