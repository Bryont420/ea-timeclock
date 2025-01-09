import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Card, CardContent, Box } from '@mui/material';
import { getTimeEntries, TimeEntriesResponse, TimeEntry } from '../services/employee';
import { useAuth } from '../contexts/AuthContext';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

interface WeeklyEntries {
  weekStart: Date;
  entries: TimeEntry[];
  totalHours: string;
}

const formatHoursToHHMM = (hours: number | null): string => {
  if (hours === null) return '0H 0M';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}H ${m}M`;
};

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
    return <LoadingOverlay open={loading} />;
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
      <Typography variant="h5" component="h1" gutterBottom>
        Time Entries
      </Typography>
      {weeklyEntries.map((week) => (
        <Card 
          key={week.weekStart.toISOString()} 
          sx={{ 
            mb: 4, 
            boxShadow: 'none',
            bgcolor: 'background.paper'
          }}
        >
          <CardContent sx={{ 
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">
                Week of {format(week.weekStart, 'MMM dd')} - {format(addDays(week.weekStart, 6), 'MMM dd')}
              </Typography>
            </Box>
            
            {/* Headers - Only visible on desktop */}
            <Box sx={{ 
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 2,
              borderBottom: 1,
              borderColor: 'divider',
              pb: 1,
              px: 2
            }}>
              <Typography variant="subtitle2" color="text.secondary">Date</Typography>
              <Typography variant="subtitle2" color="text.secondary">In Time</Typography>
              <Typography variant="subtitle2" color="text.secondary">Out Time</Typography>
              <Typography variant="subtitle2" color="text.secondary">Hours Worked</Typography>
              <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
            </Box>
            
            {week.entries.map((entry) => (
              <Card 
                key={entry.id} 
                sx={{ 
                  bgcolor: 'background.paper'
                }}
              >
                {/* Desktop View */}
                <CardContent sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 2,
                  alignItems: 'center',
                  px: 2
                }}>
                  <Typography>
                    {format(parseISO(entry.clock_in_time), 'EEE MM/dd/yy')}
                  </Typography>
                  <Typography>
                    {format(parseISO(entry.clock_in_time), 'hh:mm a')}
                  </Typography>
                  <Typography>
                    {entry.clock_out_time ? format(parseISO(entry.clock_out_time), 'hh:mm a') : 'N/A'}
                  </Typography>
                  <Typography>
                    {formatHoursToHHMM(entry.hours_worked)}
                  </Typography>
                  <Typography>
                    {entry.notes?.map((note, index) => (
                      <Box key={index} component="div" sx={{ mb: index < entry.notes.length - 1 ? 1 : 0 }}>
                        {note.note_text} - {note.created_by.username} ({format(parseISO(note.created_at), 'MM/dd/yyyy')})
                      </Box>
                    ))}
                  </Typography>
                </CardContent>

                {/* Mobile View */}
                <CardContent sx={{
                  display: { xs: 'flex', md: 'none' },
                  flexDirection: 'column',
                  gap: 1
                }}>
                  <Typography variant="subtitle1">
                    Date: {format(parseISO(entry.clock_in_time), 'EEE MM/dd/yy')}
                  </Typography>
                  <Typography variant="body2">
                    In Time: {format(parseISO(entry.clock_in_time), 'hh:mm a')}
                  </Typography>
                  <Typography variant="body2">
                    Out Time: {entry.clock_out_time ? format(parseISO(entry.clock_out_time), 'hh:mm a') : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Hours Worked: {formatHoursToHHMM(entry.hours_worked)}
                  </Typography>
                  {entry.notes && entry.notes.length > 0 && (
                    <Typography>
                      Notes:
                      {entry.notes.map((note, index) => (
                        <Box key={index} component="div" sx={{ pl: 2, mt: 0.5 }}>
                          {note.note_text} - {note.created_by.username} ({format(parseISO(note.created_at), 'MM/dd/yyyy')})
                        </Box>
                      ))}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              alignItems: 'center',
              mt: 1
            }}>
              <Typography variant="h6">
                Total Hours This Week: {week.totalHours}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
};
