$(document).ready(function() {
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function handleAjaxError(xhr, status, error) {
        alert('Error: ' + (xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Unknown error occurred.'));
        $('#loadingSpinner').hide();
    }

	function isValidDate(inputDate) {
		const today = new Date();
		
		// Get today's date in 'YYYY-MM-DD' format
		const todayStr = today.toISOString().split('T')[0];
		
		// Compare the input date string with today's date string
		return inputDate <= todayStr;
	}

    // Add Employee
    $('#add-employee-button').click(function() {
        // Show the add employee modal
        $('#addEmployeeModal').modal('show');
    });

    $('#saveAddEmployee').click(function() {
        const url = addEmployeeUrl;
        const data = {
            first_name: $('#first_name').val(),
            last_name: $('#last_name').val(),
            employee_id: $('#employee_id').val(),
            hire_date: $('#hire_date').val()  // Include hire_date in the submission
        };

        // Validate form data
        if (!data.first_name || !data.last_name || !data.employee_id) {
            alert('All fields are required.');
            return;
        }

        // Validate hire date is not in the future
        if (!isValidDate(data.hire_date)) {
            alert('Hire date cannot be in the future.');
            return;
        }

        // Send AJAX request to add the employee
        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            data: data,
            success: function(response) {
                if (response.success) {
                    location.reload();  // Reload to reflect the new employee
                } else {
                    alert(response.error);
                }
            },
            error: handleAjaxError
        });
    });

    // Edit Employee
    $('.edit-employee-button').click(function() {
        const employeeId = $(this).data('id');
        const url = editEmployeeUrl + employeeId + '/';

        $('#loadingSpinner').show();

        // Fetch employee data
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                if (response) {
                    // Populate the form fields
                    $('#edit_first_name').val(response.first_name);
                    $('#edit_last_name').val(response.last_name);
                    $('#edit_employee_id').val(response.employee_id);
                    $('#edit_hire_date').val(response.hire_date);  // Populate the hire_date field

                    // Set the form action to the current employee's ID
                    $('#editEmployeeForm').attr('action', url);

                    // Set the data-id for the reset password button dynamically
                    $('.reset-password-button').data('id', employeeId);

                    // Show the edit employee modal
                    $('#editEmployeeModal').modal('show');

                    // Hide the Spinner
                    $('#loadingSpinner').hide();
                }
            },
            error: handleAjaxError
        });
    });

    $('#saveEditEmployee').click(function() {
        const form = $('#editEmployeeForm');
        const data = {
            first_name: $('#edit_first_name').val(),
            last_name: $('#edit_last_name').val(),
            employee_id: $('#edit_employee_id').val(),
            hire_date: $('#edit_hire_date').val()  // Include hire_date in the submission
        };

        // Validate form data
        if (!data.first_name || !data.last_name || !data.employee_id) {
            alert('All fields are required.');
            return;
        }

        // Validate hire date is not in the future
        if (!isValidDate(data.hire_date)) {
            alert('Hire date cannot be in the future.');
            return;
        }

        // Send AJAX request to edit the employee
        $.ajax({
            url: form.attr('action'),
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            data: data,
            success: function(response) {
                if (response.success) {
                    location.reload();  // Reload to reflect the edited employee
                } else {
                    alert(response.error);
                }
            },
            error: handleAjaxError
        });
    });

    // Remove Employee
    $('.remove-employee-button').click(function() {
        if (!confirm('Are you sure you want to remove this employee?')) {
            return;
        }

        const employeeId = $(this).data('id');
        const url = removeEmployeeUrl + employeeId + '/';

        // Send AJAX request to remove the employee
        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            success: function(response) {
                if (response.success) {
                    location.reload();  // Reload to reflect the removal
                } else {
                    alert(response.error);
                }
            },
            error: handleAjaxError
        });
    });

    // Reset Employee Password
    $('.reset-password-button').click(function() {
        if (!confirm('Are you sure you want to reset this employee\'s password?')) {
            return;
        }

        const employeeId = $(this).data('id');
        const url = '/admin-dashboard/employee-management/' + employeeId + '/reset-password/';

        // Send AJAX request to reset the password
        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            success: function(response) {
                if (response.success) {
                    alert(response.message);  // Show success message
                } else {
                    alert('Error: ' + response.error);  // Show error message
                }
            },
            error: handleAjaxError
        });
    });
});
