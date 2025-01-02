/**
 * @fileoverview TimeOff page component that manages time off requests.
 * Provides interface for viewing existing requests and creating new ones
 * through a modal dialog form.
 */

import React, { useState, useRef } from 'react';
import { Box, Button, Dialog } from '@mui/material';
import TimeOffRequestList, { TimeOffRequestListRef } from '../components/timeoff/TimeOffRequestList';
import TimeOffRequestForm from '../components/timeoff/TimeOffRequestForm';
import AddIcon from '@mui/icons-material/Add';

/**
 * TimeOff page component that handles time off request management.
 * Features:
 * - List view of all time off requests
 * - Modal form for creating new requests
 * - Real-time list updates after submission
 * - Responsive design for all screen sizes
 * 
 * @returns The rendered TimeOff page
 */
export const TimeOff: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const listRef = useRef<TimeOffRequestListRef>(null);

    /**
     * Closes the time off request form modal
     */
    const handleClose = () => {
        setIsFormOpen(false);
    };

    /**
     * Handles successful form submission.
     * Closes the form and refreshes the request list.
     */
    const handleSubmitSuccess = () => {
        handleClose();
        // Refresh the list using the ref instead of reloading the page
        if (listRef.current) {
            listRef.current.refreshList();
        }
    };

    return (
        <Box sx={{ p: 2, color: 'text.primary' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setIsFormOpen(true)}
                >
                    New Time Off Request
                </Button>
            </Box>

            <TimeOffRequestList ref={listRef} />

            <Dialog 
                open={isFormOpen} 
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                sx={{ color: 'text.primary' }}
            >
                <TimeOffRequestForm
                    onSubmit={handleSubmitSuccess}
                    onClose={handleClose}
                />
            </Dialog>
        </Box>
    );
};
