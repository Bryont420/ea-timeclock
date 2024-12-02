/**
 * @fileoverview Quick actions panel component that provides easy access to common
 * application features through a set of action buttons. Uses Material-UI's Card
 * component and React Router for navigation.
 */

import React from 'react';
import { 
    Typography, 
    Card,
    CardContent,
    Divider,
    Button,
    Box,
} from '@mui/material';
import { Link } from 'react-router-dom';

/**
 * QuickActionsPanel component that displays a set of common actions.
 * Features:
 * - Clean card layout with consistent spacing
 * - Full-width action buttons
 * - Left-aligned button text for better readability
 * - React Router integration for navigation
 * - Different button colors for visual distinction
 * 
 * Available Actions:
 * 1. View Time Entries - Primary action for time entry management
 * 2. Request Time Off - Secondary action for leave requests
 * 
 * @returns The quick actions panel component
 */
export const QuickActionsPanel: React.FC = () => {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Quick Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2,
                    '& .MuiButton-root': {
                        justifyContent: 'flex-start'
                    }
                }}>
                    <Button
                        component={Link}
                        to="/time-entries"
                        variant="contained"
                        color="primary"
                        fullWidth
                    >
                        View Time Entries
                    </Button>
                    <Button
                        component={Link}
                        to="/time-off"
                        variant="contained"
                        color="secondary"
                        fullWidth
                    >
                        Request Time Off
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default QuickActionsPanel;
