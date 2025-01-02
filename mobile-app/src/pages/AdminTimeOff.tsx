/**
 * @fileoverview AdminTimeOff page component that provides an interface for administrators
 * to view and manage employee time off requests. Delegates the main functionality to
 * the AdminTimeOffRequestList component.
 */

import React from 'react';
import AdminTimeOffRequestList from '../components/timeoff/AdminTimeOffRequestList';

/**
 * AdminTimeOff page component that renders the time off request management interface.
 * Features:
 * - View all employee time off requests
 * - Approve or reject time off requests
 * - Filter and sort requests
 * - View request details
 * 
 * @returns The rendered AdminTimeOff page
 */
export const AdminTimeOff: React.FC = () => {
  return (
    <div>
      <AdminTimeOffRequestList />
    </div>
  );
};
