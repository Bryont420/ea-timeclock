/**
 * @fileoverview Admin time off request list component that provides a comprehensive
 * interface for managing employee time off requests. Features request review
 * functionality, status tracking, and filtering capabilities. Uses Material-UI
 * components for a consistent and responsive design.
 */

import React, { useEffect, useState } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  useMediaQuery,
  Card,
  CardContent
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { getTimeOffRequests, TimeOffRequest, reviewTimeOffRequest } from '../../services/timeoff';
import { useAdmin } from '../../contexts/AdminContext';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { LoadingOverlay } from '../common/LoadingOverlay';

/**
 * AdminTimeOffRequestList component that manages and displays time off requests.
 * Features:
 * - Tabular display of time off requests with sorting and filtering
 * - Request approval/denial functionality with notes
 * - Status tracking with color-coded chips
 * - Loading and error state handling
 * - Toggle for showing/hiding processed requests
 * - Responsive design for various screen sizes
 * 
 * Request Types:
 * - Vacation (blue)
 * - Sick (purple)
 * - Unpaid (default)
 * 
 * Request Statuses:
 * - Pending (orange)
 * - Approved (green)
 * - Denied (red)
 * 
 * Table Columns:
 * 1. Employee - Name of the requesting employee
 * 2. Type - Type of time off request
 * 3. Start Date - Request start date
 * 4. End Date - Request end date
 * 5. Hours - Number of hours requested
 * 6. Status - Current request status
 * 7. Reason - Employee's reason for request
 * 8. Actions - Approve/Deny buttons for pending requests
 * 
 * @returns The admin time off request list component
 */
const AdminTimeOffRequestList: React.FC = () => {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [processingRequests] = useState<{ [key: string]: boolean }>({});
  const [dialogProcessing, setDialogProcessing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approved' | 'denied' | null>(null);
  const [showProcessedRequests, setShowProcessedRequests] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const { setRefreshTimeEntries } = useAdmin();
  const isMobile = useMediaQuery('(max-width:600px)');

  const filteredRequests = requests.filter(request => {
    return showProcessedRequests || request.status === 'pending';
  });

  /**
   * Fetches time off requests from the API.
   * Updates the requests state and handles loading/error states.
   * 
   * @async
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

  /**
   * Handles the review click event for a time off request.
   * Opens the review dialog with the selected request and action.
   * 
   * @param request - The time off request to review
   * @param action - The review action (approved or denied)
   */
  const handleReviewClick = (request: TimeOffRequest, action: 'approved' | 'denied') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setShowReviewDialog(true);
  };

  /**
   * Handles the review submit event for a time off request.
   * Submits the review decision to the API and updates local state.
   * 
   * @async
   */
  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewAction) return;

    setDialogProcessing(true);
    try {
      await reviewTimeOffRequest(
        selectedRequest.id,
        reviewAction === 'approved' ? 'approve' : 'deny',
        reviewNotes
      );

      // Immediately update the local state
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: reviewAction, review_notes: reviewNotes }
            : req
        )
      );

      // Then fetch fresh data
      await fetchRequests();
      // Refresh time entries in case the request affects them
      setRefreshTimeEntries(() => {});
      
      setShowReviewDialog(false);
      setReviewNotes('');
      setSelectedRequest(null);
      setReviewAction(null);
    } catch (err: any) {
      console.error('Error reviewing request:', err);
      setError(err.response?.data?.error || 'Failed to review request');
    } finally {
      setDialogProcessing(false);
    }
  };

  /**
   * Gets the color for a request type chip.
   * 
   * @param type - The request type
   * @returns The Material-UI color for the chip
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
   * Gets the color for a request status chip.
   * 
   * @param status - The request status
   * @returns The Material-UI color for the chip
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

  /**
   * Formats a date string to a readable format.
   * 
   * @param dateString - The ISO date string to format
   * @returns The formatted date string
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchRequests();
      } catch (err) {
        console.error('Error loading time-off requests:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <Box>
      <LoadingOverlay open={loading || dialogProcessing} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowProcessedRequests(!showProcessedRequests)}
          startIcon={showProcessedRequests ? <VisibilityOffIcon /> : <VisibilityIcon />}
        >
          {showProcessedRequests ? 'Hide Processed Requests' : 'Show Processed Requests'}
        </Button>
      </Box>

      {filteredRequests.length === 0 ? (
        <>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 2
            }}
          >
            <Typography variant="h5" gutterBottom>
              No Time Off Requests
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {showProcessedRequests 
                ? "There are no time off requests in the system."
                : "There are no pending time off requests to review."}
            </Typography>
            <Typography variant="body2">
              {showProcessedRequests 
                ? "Time off requests will appear here when employees submit them."
                : "Click 'Show Processed Requests' above to view previous requests."}
            </Typography>
          </Paper>
        </>
      ) : (
        isMobile ? (
          <Box>
            {filteredRequests.map((request) => (
              <Card key={request.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6">{request.employee_name}</Typography>
                  <Typography variant="body2">
                    Type: {request.request_type_display || request.request_type}
                  </Typography>
                  <Typography variant="body2">
                    Start Date: {formatDate(request.start_date)}
                  </Typography>
                  <Typography variant="body2">
                    End Date: {formatDate(request.end_date)}
                  </Typography>
                  <Typography variant="body2">
                    Hours: {request.hours_requested}
                  </Typography>
                  <Typography variant="body2">
                    Status: <Chip
                      label={request.status_display || request.status}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </Typography>
                  <Typography variant="body2">
                    Reason: {request.reason}
                  </Typography>
                  {request.status === 'pending' && (
                    <Box>
                      <Button
                        size="small"
                        color="success"
                        onClick={() => handleReviewClick(request, 'approved')}
                        sx={{ mr: 1 }}
                        disabled={processingRequests[request.id]}
                      >
                        {processingRequests[request.id] ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          'Approve'
                        )}
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleReviewClick(request, 'denied')}
                        disabled={processingRequests[request.id]}
                      >
                        {processingRequests[request.id] ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          'Deny'
                        )}
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
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
                      {request.employee_name || 'Unknown'}
                    </TableCell>
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
                    <TableCell>{request.reason}</TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <Box>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleReviewClick(request, 'approved')}
                            sx={{ mr: 1 }}
                            disabled={processingRequests[request.id]}
                          >
                            {processingRequests[request.id] ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              'Approve'
                            )}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleReviewClick(request, 'denied')}
                            disabled={processingRequests[request.id]}
                          >
                            {processingRequests[request.id] ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              'Deny'
                            )}
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      <Dialog
        open={showReviewDialog}
        onClose={() => !dialogProcessing && setShowReviewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewAction === 'approved' ? 'Approve' : 'Deny'} Time Off Request
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedRequest && (
              <>
                Reviewing request for {selectedRequest.employee_name}
                <br />
                {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                <br />
                {selectedRequest.hours_requested} hours
              </>
            )}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Review Notes"
            fullWidth
            multiline
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            disabled={dialogProcessing}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowReviewDialog(false)} 
            color="inherit"
            disabled={dialogProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReviewSubmit}
            color={reviewAction === 'approved' ? 'success' : 'error'}
            variant="contained"
            disabled={dialogProcessing}
            startIcon={dialogProcessing ? <CircularProgress size={20} /> : null}
          >
            {dialogProcessing 
              ? (reviewAction === 'approved' ? 'Approving...' : 'Denying...') 
              : (reviewAction === 'approved' ? 'Approve' : 'Deny')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

};

export default AdminTimeOffRequestList;
