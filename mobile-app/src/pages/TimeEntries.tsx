import React, { useState, useEffect, memo } from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import { getTimeEntries, TimeEntriesResponse, TimeEntry } from '../services/employee';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import TimeEntriesHeader from '../components/timeentries/TimeEntriesHeader';
import WeeklyTimeTable from '../components/timeentries/WeeklyTimeTable';

interface WeeklyEntries {
  weekStart: Date;
  entries: TimeEntry[];
  totalHours: string;
}

export const TimeEntries: React.FC = memo(() => {
  const [timeEntries, setTimeEntries] = useState<TimeEntriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntries[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError('Please log in to view time entries');
        setLoading(false);
        return;
      }

      try {
        const data = await getTimeEntries();
        setTimeEntries(data);
        
        // Group entries by week
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
    };
    fetchData();
  }, [user]);

  const groupEntriesByWeek = (entries: TimeEntry[], weeklyTotals: { [key: string]: string }): WeeklyEntries[] => {
    const weeks: { [key: string]: TimeEntry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.clock_in_time);
      
      // Calculate the Thursday
      let thursdayDate = new Date(date);
      const dayOfWeek = date.getDay();
      
      // For Thu (4), Fri (5), Sat (6): go back 0, 1, 2 days
      // For Sun (0), Mon (1), Tue (2), Wed (3): go back 3, 4, 5, 6 days
      const daysToSubtract = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
      thursdayDate.setDate(date.getDate() - daysToSubtract);
      
      // Set to local midnight
      thursdayDate = new Date(thursdayDate.getFullYear(), thursdayDate.getMonth(), thursdayDate.getDate());
      
      // Create key using local date components to avoid timezone issues
      const weekKey = `${thursdayDate.getFullYear()}-${String(thursdayDate.getMonth() + 1).padStart(2, '0')}-${String(thursdayDate.getDate()).padStart(2, '0')}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(entry);
    });

    return Object.entries(weeks)
      .map(([weekKey, entries]) => {
        // Parse the date components from our custom weekKey format
        const [year, month, day] = weekKey.split('-').map(num => parseInt(num, 10));
        const weekStart = new Date(year, month - 1, day); // month is 0-based in Date constructor
        
        // Calculate total hours from entries for accuracy
        const totalMinutes = entries.reduce((sum, entry) => {
          const hours = entry.hours_worked || 0;
          return sum + Math.round(hours * 60);
        }, 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const totalHours = `${hours}H ${minutes}M`;
        
        return {
          weekStart,
          entries: entries.sort((a, b) => 
            new Date(a.clock_in_time).getTime() - new Date(b.clock_in_time).getTime()
          ),
          totalHours
        };
      })
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  };

  const MemoizedWeeklyTimeTable = React.memo(WeeklyTimeTable);
  const MemoizedTimeEntriesHeader = React.memo(TimeEntriesHeader);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!timeEntries || !timeEntries.entries || timeEntries.entries.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 2
          }}
        >
          <Typography variant="h5" gutterBottom color="primary">
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {weeklyEntries.map((week) => (
        <Box key={week.weekStart.toISOString()} sx={{ mb: 4 }}>
          <MemoizedTimeEntriesHeader 
            weekStart={week.weekStart}
            weekTotalHours={week.totalHours}
          />
          <MemoizedWeeklyTimeTable 
            entries={week.entries}
            weekStart={week.weekStart}
            totalHours={week.totalHours}
          />
        </Box>
      ))}
    </Container>
  );
});

export default TimeEntries;
