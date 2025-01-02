/**
 * @fileoverview Time off request list component that displays an employee's time
 * off requests in a responsive format. Features request management, status
 * tracking, and filtering capabilities with both desktop and mobile views.
 */

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
  Alert,
  Dialog,
  Button,
  useMediaQuery,
  Card,
  CardContent,
} from '@mui/material';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { getTimeOffRequests, TimeOffRequest, deleteTimeOffRequest } from '../../services/timeoff';
import { TimeOffRequestForm } from './TimeOffRequestForm';
import { LoadingOverlay } from '../common/LoadingOverlay';
import { LoadingSpinner } from '../common/LoadingSpinner';

/**
 * Interface for the TimeOffRequestList component's ref methods.
 */
export interface TimeOffRequestListRef {
  /** Method to refresh the list of time off requests */
  refreshList: () => void;
}

/**
 * TimeOffRequestList component that displays and manages time off requests.
 * Features:
 * - Responsive design with separate mobile and desktop views
 * - Request editing and deletion functionality
 * - Status tracking with color-coded chips
 * - Request type categorization
 * - Toggle for showing/hiding previous requests
 * - Loading and error state handling
 * - Refresh capability via ref
 * 
 * @returns The time off request list component
 */
const TimeOffRequestList = forwardRef<TimeOffRequestListRef>((_, ref) => {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviousRequests, setShowPreviousRequests] = useState(false);

  const isMobile = useMediaQuery('(max-width:600px)');

  /**
   * Fetches time off requests from the API.
   */
  const fetchRequests = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchRequests();
  }, []);

  /**
   * Filters time off requests based on the showPreviousRequests flag.
   * @param requests The list of time off requests to filter.
   * @returns The filtered list of time off requests.
   */
  const filterRequests = (requests: TimeOffRequest[]) => {
    const today = startOfToday();
    return requests.filter(request => {
      const startDate = parseISO(request.start_date);
      return showPreviousRequests || !isBefore(startDate, today);
    });
  };

  /**
   * Handles the edit request action.
   * @param request The time off request to edit.
   */
  const handleEdit = (request: TimeOffRequest) => {
    setEditingRequest(request);
    setShowEditDialog(true);
  };

  /**
   * Handles the successful edit request action.
   */
  const handleEditSuccess = async () => {
    setShowEditDialog(false);
    setEditingRequest(null);
    await fetchRequests(); // Refresh the list after successful edit
  };

  /**
   * Handles the delete request action.
   * @param request The time off request to delete.
   */
  const handleDelete = async (request: TimeOffRequest) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      setLoading(true);
      try {
        await deleteTimeOffRequest(request.id);
        // Immediately update local state
        setRequests(prevRequests => prevRequests.filter(r => r.id !== request.id));
        // Then fetch fresh data
        await fetchRequests();
      } catch (err: any) {
        console.error('Error deleting request:', err);
        setError(err.response?.data?.error || 'Failed to delete request');
      } finally {
        setLoading(false);
      }
    }
  };

  /**
   * Checks if a request can be modified.
   * @param request The time off request to check.
   * @returns True if the request can be modified, false otherwise.
   */
  const canModifyRequest = (request: TimeOffRequest) => {
    return request.status === 'pending';
  };

  /**
   * Formats a date string.
   * @param dateString The date string to format.
   * @returns The formatted date string.
   */
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MM/dd/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  /**
   * Gets the color for a request type.
   * @param type The request type.
   * @returns The color for the request type.
   */
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

  /**
   * Gets the color for a request status.
   * @param status The request status.
   * @returns The color for the request status.
   */
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
    return <LoadingSpinner />;
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
        {isMobile ? (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowPreviousRequests(!showPreviousRequests)}
              startIcon={showPreviousRequests ? <VisibilityOffIcon /> : <VisibilityIcon />}
            >
              {showPreviousRequests ? 'Hide Previous Requests' : 'Show Previous Requests'}
            </Button>
          </Box>
        ) : (
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
        )}
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
    <Box sx={{ color: 'text.primary' }}>
      <LoadingOverlay open={loading} />
      {isMobile ? (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowPreviousRequests(!showPreviousRequests)}
              startIcon={showPreviousRequests ? <VisibilityOffIcon /> : <VisibilityIcon />}
            >
              {showPreviousRequests ? 'Hide Previous Requests' : 'Show Previous Requests'}
            </Button>
          </Box>
          {filteredRequests.map((request) => (
            <Card key={request.id} sx={{ mb: 2, backgroundColor: 'background.paper', color: 'text.primary' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'text.primary' }}>{request.employee_name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary' }}>Type: {request.request_type_display || request.request_type}</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary' }}>Start Date: {formatDate(request.start_date)}</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary' }}>End Date: {formatDate(request.end_date)}</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary' }}>Hours: {request.hours_requested}</Typography>
                <Chip label={`Status: ${request.status}`} color={getStatusColor(request.status)} size="small" />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Reason: {request.reason || '-'}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  {canModifyRequest(request) && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(request)}
                        disabled={loading}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(request)}
                        disabled={loading}
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
          <TableContainer component={Paper} sx={{ mb: 3, backgroundColor: 'background.paper', color: 'text.primary' }}>
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
                    <TableCell sx={{ color: 'text.secondary' }}>{request.reason || '-'}</TableCell>
                    <TableCell>
                      {canModifyRequest(request) && (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<EditIcon />}
                            onClick={() => handleEdit(request)}
                            disabled={loading}
                            sx={{ mr: 1 }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDelete(request)}
                            disabled={loading}
                            sx={{ ml: 1 }}
                          >
                            Delete
                          </Button>
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
            onSubmit={handleEditSuccess}
            onClose={() => setShowEditDialog(false)}
            isDialog
          />
        )}
      </Dialog>
    </Box>
  );
});

export default TimeOffRequestList;
