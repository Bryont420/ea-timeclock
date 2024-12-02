    $(document).ready(function() {
        let debounceTimer;

        // Warm-up call on page load
        warmUpDatabase();

        // Set an interval to warm up the database every hour (3600000 milliseconds)
        setInterval(warmUpDatabase, 3600000);

        $('#employee_id').on('input', function() {
            clearTimeout(debounceTimer);

            const employeeId = $(this).val().trim();

            if (employeeId === '') {
                // If the input is blank, clear the fields without showing any message
                $('#full_name').text('');
                $('#clock_button').text('Clock In / Out');
                $('#message').text('');  // Clear any previous message
                return;  // Stop further processing
            }

            // Only proceed if we have exactly 3 digits
			if ((employeeId.length === 2 || employeeId.length === 3) && !isNaN(employeeId)) {
                debounceTimer = setTimeout(function() {
                    // Show loading indicator or some default feedback immediately
                    $('#full_name').text('Loading...');
                    $('#clock_button').text('Checking...');

                    $.ajax({
                        url: checkStatusUrl,
                        type: 'POST',
                        data: {
                            'employee_id': employeeId,
                            'csrfmiddlewaretoken': csrfToken
                        },
                        success: function(data) {
                            $('#full_name').text(data.full_name);
                            $('#clock_button').text(data.button_text);
                            $('#message').text('');  // Clear any previous message
                        },
                        error: function() {
                            $('#full_name').text('Employee not found');
                            $('#clock_button').text('Clock In / Out');
                            $('#message').text('');  // Clear any previous message
                        }
                    });
                }, 300);  // Delay of 300ms after user stops typing
            } else {
                // Clear fields if input is invalid or incomplete
                $('#full_name').text('Enter a valid 2 or 3-digit ID');
                $('#clock_button').text('Clock In / Out');
                $('#message').text('');  // Clear any previous message
            }
        });

        $('#clock_button').on('click', function() {
            handleClockAction();
        });

        // Handle Enter key press
        $('#employee_id').on('keypress', function(e) {
            if (e.which === 13) {  // Enter key pressed
                e.preventDefault();  // Prevent form submission
                handleClockAction();
            }
        });

        function handleClockAction() {
            const employeeId = $('#employee_id').val().trim();

			if ((employeeId.length === 2 || employeeId.length === 3) && !isNaN(employeeId)) {
                $.ajax({
                    url: clockActionUrl,
                    type: 'POST',
                    data: {
                        'employee_id': employeeId,
                        'csrfmiddlewaretoken': csrfToken
                    },
                    success: function(data) {
                        console.log('Response data:', data);
                        if (data.status === 'success') {
                            $('#message').text(data.message).fadeIn();
                            $('#employee_id').val('');  // Clear the input field
                            setTimeout(function() {
                                $('#full_name').text('');  // Clear the employee name
                            }, 1500); // Hide Name after 1.5 seconds
                            setTimeout(function() {
                                $('#message').fadeOut();
                            }, 2000);  // Hide the message after 2 seconds
                            $('#clock_button').text('Clock In / Out'); // Reset Button text
                        } else {
                            alert('Error processing request');
                        }
                    },
                    error: function() {
                        alert('Error processing request');
                    }
                });
            } else {
                alert('Please enter a valid 2 or 3-digit employee ID');
            }
        }

        function warmUpDatabase() {
            $.ajax({
                url: checkStatusUrl,
                type: 'POST',
                data: {
                    'employee_id': '211',  // Warm-up with employee ID 211
                    'csrfmiddlewaretoken': csrfToken
                },
                success: function(data) {
                    console.log('Warm-up successful');
                },
                error: function() {
                    console.log('Warm-up failed');
                }
            });
        }
    });