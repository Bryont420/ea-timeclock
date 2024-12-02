import React, { useState, useRef } from 'react';
import { Box, Button, Dialog } from '@mui/material';
import TimeOffRequestList, { TimeOffRequestListRef } from '../components/timeoff/TimeOffRequestList';
import TimeOffRequestForm from '../components/timeoff/TimeOffRequestForm';
import AddIcon from '@mui/icons-material/Add';

export const TimeOff: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const listRef = useRef<TimeOffRequestListRef>(null);

  const handleClose = () => {
    setIsFormOpen(false);
  };

  const handleSubmitSuccess = () => {
    handleClose();
    // Refresh the list using the ref instead of reloading the page
    if (listRef.current) {
      listRef.current.refreshList();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
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
      >
        <TimeOffRequestForm
          onSubmit={handleSubmitSuccess}
          onClose={handleClose}
        />
      </Dialog>
    </Box>
  );
};
