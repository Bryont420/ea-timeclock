$(document).ready(function() {
    let employeeId = null;

    // Open modal for resetting vacation hours
    $('.reset-vacation-hours-button').on('click', function() {
        employeeId = $(this).data('id');
        $('#resetVacationHoursModal').modal('show');
    });

    // Reset Vacation hours via AJAX
    $('#saveResetVacationHours').on('click', function() {
        const url = base_url.slice(0, -2) + employeeId + '/';
        const formData = $('#resetVacationHoursForm').serialize();

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            success: function(data) {
                if (data.success) {
                    location.reload();
                }
            },
            error: function(xhr) {
                alert('Error resetting Vacation hours.');
            }
        });
    });
});
