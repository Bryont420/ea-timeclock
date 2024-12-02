$(document).ready(function() {
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    // Open the reset modal when clicking the reset button
    $('.reset-sick-hours-button').click(function() {
        const employeeId = $(this).data('id');
        $('#resetSickHoursModal').modal('show');
        $('#submitResetSickHours').data('id', employeeId);
    });

    // Handle resetting sick hours
    $('#submitResetSickHours').click(function() {
        const employeeId = $(this).data('id');
		const url = base_url.slice(0, -2) + employeeId + '/';
        const data = {
            sick_hours_allocated: $('#sick_hours_allocated').val(),
        };

        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            data: data,
            success: function(response) {
                if (response.success) {
                    location.reload(); // Reload the page to reflect the new hours
                } else {
                    alert('Error resetting sick hours');
                }
            },
            error: function() {
                alert('Error resetting sick hours');
            }
        });
    });
});
