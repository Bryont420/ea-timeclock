import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  Tooltip,
  Button,
  useMediaQuery,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { getTimeOffRequests, TimeOffRequest, deleteTimeOffRequest } from '../../services/timeoff';
import { TimeOffRequestForm } from './TimeOffRequestForm';

export interface TimeOffRequestListRef {
  refreshList: () => void;
}

const TimeOffRequestList = forwardRef<TimeOffRequestListRef>((_, ref) => {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviousRequests, setShowPreviousRequests] = useState(false);

  const isMobile = useMediaQuery('(max-width:600px)');
  const theme = useTheme();

  const fetchRequests = async () => {
    try {
      const data = await getTimeOffRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching time-off requests:', err);
      setError(err.response?.data?.error || 'Failed to load time-off requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshList: fetchRequests
  }));

  const filterRequests = (requests: TimeOffRequest[]) => {
    const today = startOfToday();
    return requests.filter(request => {
      const startDate = parseISO(request.start_date);
      return showPreviousRequests || !isBefore(startDate, today);
    });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleEdit = (request: TimeOffRequest) => {
    setEditingRequest(request);
    setShowEditDialog(true);
  };

  const handleDelete = async (request: TimeOffRequest) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        await deleteTimeOffRequest(request.id);
        await fetchRequests();
      } catch (err: any) {
        console.error('Error deleting request:', err);
        setError(err.response?.data?.error || 'Failed to delete request');
      }
    }
  };

  const canModifyRequest = (request: TimeOffRequest) => {
    return request.status === 'pending';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MM/dd/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const getRequestTypeColor = (type: TimeOffRequest['request_type']) => {
    switch (type) {
      case 'vacation':
        return 'primary';
      case 'sick':
        return 'secondary';
      case 'unpaid':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: TimeOffRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'denied':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const filteredRequests = filterRequests(requests);
  if (!filteredRequests.length) {
    return (
      <>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowPreviousRequests(!showPreviousRequests)}
            startIcon={showPreviousRequests ? <VisibilityOffIcon /> : <VisibilityIcon />}
          >
            {showPreviousRequests ? 'Hide Previous Requests' : 'Show Previous Requests'}
          </Button>
        </Box>
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
            No Time Off Requests
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {showPreviousRequests 
              ? "You haven't made any time off requests yet."
              : "You don't have any upcoming time off requests."}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {showPreviousRequests 
              ? "When you submit time off requests, they'll appear here."
              : "Click 'New Time Off Request' above to request time off."}
          </Typography>
        </Paper>
      </>
    );
  }

  return (
    <Box>
      {isMobile ? (
        <Box>
          {filteredRequests.map((request) => (
            <Card key={request.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">{request.employee_name}</Typography>
                <Typography variant="body2">Type: {request.request_type_display || request.request_type}</Typography>
                <Typography variant="body2">Start Date: {formatDate(request.start_date)}</Typography>
                <Typography variant="body2">End Date: {formatDate(request.end_date)}</Typography>
                <Typography variant="body2">Hours: {request.hours_requested}</Typography>
                <Chip label={`Status: ${request.status}`} color={getStatusColor(request.status)} size="small" />
                <Typography variant="body2" sx={{ color: theme.palette.primary.main }}>Reason: {request.reason || '-'}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  {canModifyRequest(request) && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(request)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(request)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowPreviousRequests(!showPreviousRequests)}
              startIcon={showPreviousRequests ? <VisibilityOffIcon /> : <VisibilityIcon />}
            >
              {showPreviousRequests ? 'Hide Previous Requests' : 'Show Previous Requests'}
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Chip
                        label={request.request_type_display || request.request_type}
                        color={getRequestTypeColor(request.request_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(request.start_date)}</TableCell>
                    <TableCell>{formatDate(request.end_date)}</TableCell>
                    <TableCell>{request.hours_requested}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.status_display || request.status}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.primary.main }}>{request.reason || '-'}</TableCell>
                    <TableCell>
                      {canModifyRequest(request) && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(request)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(request)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {editingRequest && (
          <TimeOffRequestForm
            initialRequest={editingRequest}
            onSubmit={() => {
              setShowEditDialog(false);
              fetchRequests();
            }}
            onClose={() => setShowEditDialog(false)}
            isDialog
          />
        )}
      </Dialog>
    </Box>
  );
});

export default TimeOffRequestList;
