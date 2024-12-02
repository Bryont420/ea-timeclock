$(document).ready(function() {
    let debounceTimer;
    let clearInputTimer;
    let clearNoteTimer;
    let noteModalActive = false;  // Track if the note modal is active

    // Hide the modal on page load
    $('#addNoteModal').hide();

    // Warm-up call on page load
    warmUpDatabase();

    // Set an interval to refresh the page every 15 minutes (900000 milliseconds)
    setInterval(function() {
        location.reload();  // Refresh the page every 15 minutes
    }, 900000);  // 15-minute delay

    // Set a timer to clear the input after 10 seconds of inactivity
    function startClearInputTimer() {
        clearInputTimer = setTimeout(function() {
            if (!noteModalActive) {  // Only clear input if the note modal is not active
                $('#employee_id').val('');  // Clear the input field
                $('#full_name').text('');
                $('#clock_button').text('Clock In / Out');
                $('#message').text('No input detected. Clearing field...');
                $('#time-entries-container').hide();
                $('#employee_id').blur();  // Unfocus the input to allow focus to trigger again

                // Wait for 3 seconds, then clear the message unless the input field is focused again
                setTimeout(function() {
                    if (!$('#employee_id').is(':focus')) {
                        $('#message').text('');  // Clear the message after 3 seconds
                    }
                }, 3000);  // 3-second delay
            }
        }, 10000);  // 10-second delay
    }

    function startClearNoteModalTimer() {
        clearNoteTimer = setTimeout(function() {
            if (noteModalActive) {  // Only close the modal if it's active
                $('#addNoteModal').fadeOut();  // Close the modal
                $('#employee_id').val('');  // Clear the input field
                $('#full_name').text('');
                $('#clock_button').text('Clock In / Out');
                $('#message').text('No input detected. Clearing field...');
                $('#time-entries-container').hide();
                $('#employee_id').blur();  // Unfocus the input to allow focus to trigger again

                noteModalActive = false;  // Reset the modal active flag
				
                // Wait for 3 seconds, then clear the message unless the input field is focused again
                setTimeout(function() {
                    if (!$('#employee_id').is(':focus')) {
                        $('#message').text('');  // Clear the message after 3 seconds
                    }
                }, 3000);  // 3-second delay
                // After closing the modal, restart the input field timer
                startClearInputTimer();
            }
        }, 20000);  // 20-second delay for the note modal
    }

    $('#employee_id').on('input', function() {
        clearTimeout(debounceTimer);
        clearTimeout(clearInputTimer);  // Clear the input clearing timer if there's new input

        const employeeId = $('<div>').text($(this).val().trim()).html();

        if (employeeId === '') {
            $('#full_name').text('');
            $('#clock_button').text('Clock In / Out');
            $('#message').text('');
            $('#time-entries-container').hide();
            return;
        }

        startClearInputTimer();  // Start the 10-second timer for inactivity

        if ((employeeId.length === 2 || employeeId.length === 3) && !isNaN(employeeId)) {
            debounceTimer = setTimeout(function() {
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
                        $('#full_name').text($('<div>').text(data.full_name).html());
                        $('#clock_button').text($('<div>').text(data.button_text).html());
                        $('#message').text('');

                        if (data.time_entries.length > 0) {
                            $('#time-entries-list').empty();
                            data.time_entries.forEach(function(entry) {
                                const clockInTime = $('<div>').text(entry.clock_in_time).html();
                                const clockOutTime = $('<div>').text(entry.clock_out_time).html();
                                const entryId = $('<div>').text(entry.id).html();
                                
                                $('#time-entries-list').append(
                                    `<li data-id="${entryId}">
                                        <a href="#" class="time-entry-link">${clockInTime} - ${clockOutTime}</a>
                                    </li>`
                                );
                            });
                            $('#time-entries-container').show();
                        } else {
                            $('#time-entries-container').hide();
                        }
                    },
                    error: function() {
                        $('#full_name').text('Employee not found');
                        $('#clock_button').text('Clock In / Out');
                        $('#message').text('');
                        $('#time-entries-container').hide();
                    }
                });
            }, 300);  // Delay before making the request
        } else {
            $('#full_name').text('Enter a valid 2 or 3-digit ID');
            $('#clock_button').text('Clock In / Out');
            $('#message').text('');
            $('#time-entries-container').hide();
        }
    });

    // Clear the message immediately if the user clicks the input area again ONLY when 'No input detected' message is present
    $('#employee_id').on('focus', function() {
        if ($('#message').text() === 'No input detected. Clearing field...') {
            clearTimeout(clearInputTimer);  // Clear the input clearing timer if user refocuses
            $('#message').text('');  // Immediately clear the message if the user clicks the input
        }
    });

    // If a time entry is clicked to add a note, cancel the input clearing timer
    $(document).on('click', '.time-entry-link', function(e) {
        e.preventDefault();
        clearTimeout(clearInputTimer);  // Cancel the input clearing timer
        clearTimeout(clearNoteTimer);   // Cancel any existing note modal timer
        noteModalActive = true;  // Mark that the note modal is active

        const entryId = $(this).closest('li').data('id');
        $('#note_entry_id').val(entryId);
        $('#note_text').val(''); // Clear previous note
        $('#addNoteModal').fadeIn(); // Show the modal using jQuery's fadeIn method

        startClearNoteModalTimer();  // Start the 20-second inactivity timer for the note modal
    });

    $('#submitNoteButton').on('click', function() {
        const entryId = $('#note_entry_id').val();  // Fetch the time entry ID
        const note = $('#note_text').val().trim();  // Fetch the note text
        const employeeId = $('#employee_id').val();  // Fetch the employee ID from the input field

        if (note) {
            $.ajax({
                url: '/add-note/',
                type: 'POST',
                data: {
                    'entry_id': entryId,
                    'note': note,
                    'employee_id': employeeId,  // Include employee ID in the request
                    'csrfmiddlewaretoken': csrfToken
                },
                success: function(response) {
                    if (response.status === 'success') {
                        $('#addNoteModal').fadeOut(); // Hide the modal on success
                        noteModalActive = false;  // Reset the modal active flag
                        clearTimeout(clearNoteTimer);  // Clear the note modal timer
                        startClearInputTimer();  // Restart the input field timer
                        location.reload(); // Reload the page to reflect the new note
                    } else {
                        alert('Failed to add note.');
                    }
                },
                error: function(xhr, status, error) {
                    alert('Failed to add note.');
                }
            });
        } else {
            alert('Please enter a note.');
        }
    });

    // Event handler for closing the modal
    $('#closeModalButton').on('click', function() {
        $('#addNoteModal').fadeOut(); // Hide the modal when close button is clicked
        noteModalActive = false;  // Reset the modal active flag
        clearTimeout(clearNoteTimer);  // Clear the note modal timer
        startClearInputTimer();  // Restart the input field timer
    });

    // Bind handleClockAction to the clock_button
    $('#clock_button').on('click', handleClockAction);

    $('#employee_id').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            handleClockAction();
        }
    });
    function handleClockAction() {
        const employeeId = $('<div>').text($('#employee_id').val().trim()).html();

        if ((employeeId.length === 2 || employeeId.length === 3) && !isNaN(employeeId)) {
            // Disable input and button during processing
            $('#employee_id').prop('disabled', true);
            $('#clock_button').prop('disabled', true);

            $.ajax({
                url: clockActionUrl,
                type: 'POST',
                data: {
                    'employee_id': employeeId,
                    'csrfmiddlewaretoken': csrfToken
                },
                success: function(data) {
                    if (data.status === 'success') {
                        $('#message').text($('<div>').text(data.message).html()).fadeIn();
                        $('#employee_id').val('');  // Clear input after success
                        
                        // Hide clock entries and message after a short delay
                        setTimeout(function() {
                            $('#full_name').text('');
                            $('#time-entries-container').hide();
                            $('#message').fadeOut();
                            
                            // Re-enable input and button after message is gone
                            $('#employee_id').prop('disabled', false);
                            $('#clock_button').prop('disabled', false);
                        }, 2000);

                        $('#clock_button').text('Clock In / Out');
                    } else {
                        alert('Error processing request');
                        $('#employee_id').prop('disabled', false);  // Re-enable on failure
                        $('#clock_button').prop('disabled', false);
                    }
                },
                error: function(xhr, status, error) {
                    alert('Error processing request');
                    $('#employee_id').prop('disabled', false);
                    $('#clock_button').prop('disabled', false);
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
                'employee_id': '211',
                'csrfmiddlewaretoken': csrfToken
            },
            success: function(data) {
                // warm-up complete
            },
            error: function(xhr, status, error) {
                // Error handling
            }
        });
    }
});
