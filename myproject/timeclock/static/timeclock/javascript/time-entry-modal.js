$(document).ready(function() {
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    // Helper function to validate and compare dates and times
	function validateClockInOutTimes(clockInDateTime, clockOutDateTime, isDateOnly, isClockedIn) {
		if (!clockInDateTime || clockInDateTime.trim() === '') {
			alert('Please provide a Clock In Date/Time.');
			return false;
		}
	
		// Allow clock out time to be blank if the clocked-in box is checked
		if (isClockedIn && (!clockOutDateTime || clockOutDateTime.trim() === '')) {
			return true;  // Skip further validation if the user is marked as clocked in
		}
	
		if (!clockOutDateTime || clockOutDateTime.trim() === '') {
			alert('Please provide a Clock Out Date/Time.');
			return false;
		}
	
		let inDateTime, outDateTime;
	
		// If it's date-only, assume the time is 00:00:00
		if (isDateOnly) {
			inDateTime = new Date(clockInDateTime + 'T00:00:00');
			outDateTime = new Date(clockOutDateTime + 'T00:00:00');
		} else {
			inDateTime = new Date(clockInDateTime);
			outDateTime = new Date(clockOutDateTime);
		}
	
		if (isNaN(inDateTime.getTime()) || isNaN(outDateTime.getTime())) {
			alert('Invalid date or time format.');
			return false;
		}
	
		// Compare the two datetime values
		if (outDateTime < inDateTime) {
			alert('Clock Out Date/Time cannot be earlier than Clock In Date/Time.');
			return false;
		}
	
		return true;
	}


    // Helper function to parse date, time, or both
    function parseDateTime(dateTimeStr) {
        // Trim any leading/trailing spaces
        dateTimeStr = dateTimeStr.trim();

        // Try parsing both date and time together
        let dateTime = new Date(dateTimeStr);
        if (!isNaN(dateTime)) {
            return dateTime;
        }

        // Try parsing separate date and time values
        const dateTimePattern = /^(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}):(\d{2})\s?(AM|PM)?$/i;
        const match = dateTimeStr.match(dateTimePattern);

        if (match) {
            const datePart = match[1] ? new Date(match[1]) : new Date('1970-01-01');  // If no date, use default
            const hours = parseInt(match[2]);
            const minutes = parseInt(match[3]);
            const period = match[4];

            // Adjust hours for 12-hour format
            let parsedHours = hours;
            if (period && period.toUpperCase() === 'PM' && hours !== 12) {
                parsedHours += 12;
            } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
                parsedHours = 0;
            }

            // Set the time to the date object
            datePart.setHours(parsedHours);
            datePart.setMinutes(minutes);
            datePart.setSeconds(0);

            return datePart;
        }

        // If it doesn't match the pattern, return null
        return null;
    }

    function validateForm(data, formType) {
        if (formType === 'edit') {
            const newNote = $('#new_note').val();
			const isClockedIn = $('#toggle-clocked-in-edit').is(':checked');  // Check the state of the clocked-in toggle

            if (!validateClockInOutTimes(data.clock_in_time, data.clock_out_time, false, isClockedIn)) {
                return false;
            }

            if (!newNote || newNote.trim() === '') {
                alert('Please provide a new note.');
                return false;
            }
        }

        if (formType === 'regular') {
			const isClockedIn = $('#toggle-clocked-in').is(':checked');  // Check the state of the clocked-in toggle
            if (!data.employee_id || data.employee_id.trim() === '') {
                alert('Please select an Employee.');
                return false;
            }

            if (!validateClockInOutTimes(data.clock_in_time, data.clock_out_time, false, isClockedIn)) {
                return false;
            }

            // Check if notes array exists and has at least one valid note
            if (!data.notes || !Array.isArray(data.notes) || data.notes.length === 0 || !data.notes[0].note_text.trim()) {
                alert('Please fill out the Notes field.');
                return false;
            }

            if (data.is_vacation && (!data.clock_in_time || !data.clock_out_time)) {
                alert('Vacation entries require both Clock In and Clock Out times.');
                return false;
            }
        }

        if (formType === 'vacation') {
            if (!data.employee_id_vacation || data.employee_id_vacation.trim() === '') {
                alert('Please select an Employee.');
                return false;
            }

            if (!validateClockInOutTimes(data.start_date, data.end_date, true)) {
                return false;
            }

            // Check if notes array exists and has at least one valid note
            if (!data.notes || !Array.isArray(data.notes) || data.notes.length === 0 || !data.notes[0].note_text.trim()) {
                alert('Please fill out the Notes field.');
                return false;
            }
        }

        if (formType === 'holiday') {
            if (!data.employee_ids || data.employee_ids.length === 0) {
                alert('Please select at least one Employee.');
                return false;
            }

            if (!validateClockInOutTimes(data.start_date, data.end_date, true)) {
                return false;
            }

            // Check if notes array exists and has at least one valid note
            if (!data.notes || !Array.isArray(data.notes) || data.notes.length === 0 || !data.notes[0].note_text.trim()) {
                alert('Please fill out the Notes field.');
                return false;
            }

        }

        if (formType === 'sick') {
            if (!data.employee_id_sick || data.employee_id_sick.trim() === '') {
                alert('Please select an Employee.');
                return false;
            }

            if (!validateClockInOutTimes(data.clock_in_time, data.clock_out_time, false)) {
                return false;
            }

            // Check if notes array exists and has at least one valid note
            if (!data.notes || !Array.isArray(data.notes) || data.notes.length === 0 || !data.notes[0].note_text.trim()) {
                alert('Please fill out the Notes field.');
                return false;
            }
        }

        return true;
    }

    // Open the edit modal and load the time entry data
    $('.edit-time-entry').click(function() {
        var entryId = $(this).data('id');

        // Show the loading text before making the request
        $('#loadingSpinner').show();

        $.ajax({
            url: '/admin-dashboard/edit_time_entry/' + entryId + '/',
            type: 'GET',
            success: function(data) {
                $('#editTimeEntryForm').attr('action', '/admin-dashboard/edit_time_entry/' + entryId + '/');
                $('#edit_clock_in_time').val(data.clock_in_time);
                $('#edit_clock_out_time').val(data.clock_out_time);
                $('#employee_id').val(data.employee_id);  // Add employee_id to a hidden input in the form
                populateNotesTable(data.notes);  // Populate the notes in the table
                $('#editTimeEntryModal').modal('show');  // Show the modal
            },
            error: function(xhr, status, error) {
                alert('Error loading time entry data.');
            },
            complete: function() {
                // Hide the loading text once the request is complete
                $('#loadingSpinner').hide();
            }
        });
    });

    function populateNotesTable(notes) {
        const notesTableBody = $('#notesTable tbody');
        notesTableBody.empty();  // Clear existing rows

        notes.forEach((note, index) => {
            let editable = note.editable ? '' : 'readonly';
            let removeCheckbox = note.editable ? `<input type="checkbox" class="delete-note" name="notes-${index}-delete" value="${note.id}">` : '';

            let rowHtml = `
                <tr class="form-row dynamic-notes" id="notes-${index}">
                    <td class="field-created_by">${note.created_by || '-'}</td>
                    <td class="field-note_text">
                        <textarea name="notes-${index}-note_text" cols="40" rows="2" class="vLargeTextField" ${editable}>${note.note_text}</textarea>
                        <input type="hidden" name="notes-${index}-id" value="${note.id}">
                        <input type="hidden" name="notes-${index}-created_by" value="${note.created_by_id || ''}">
                    </td>
                    <td class="field-created_at">${note.created_at || '-'}</td>
                    <td class="field-updated_at">${note.updated_at || '-'}</td>
                    <td class="delete">${removeCheckbox}</td>
                </tr>`;
            notesTableBody.append(rowHtml);
        });
    }

    // Submit the edited time entry
    $('#saveEditTimeEntry').click(function() {
        var form = $('#editTimeEntryForm');
        var data = {
            employee_id: $('#employee_id').val(),  // Include employee_id in the data
            clock_in_time: $('#edit_clock_in_time').val(),
            clock_out_time: $('#edit_clock_out_time').val(),
            notes: collectNotesData()  // Collect the notes data
        };

        if (validateForm(data, 'edit')) {
            $.ajax({
                url: form.attr('action'),
                type: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken()  // Include CSRF token in the request
                },
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: function(response) {
                    if (response.status === 'success') {
                        $('#editTimeEntryModal').modal('hide');
                        location.reload();  // Reload the page to show the updated time entry
                    } else {
                        alert('Error: ' + response.message);  // Show the error message from the server
                    }
                },
                error: function(xhr, status, error) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        alert('Error: ' + (response.message || 'Unknown error occurred while saving time entry.'));
                    } catch (e) {
                        alert('Unexpected error occurred. Please try again.');
                        console.error('Error parsing JSON response:', e);
                    }
                }
            });
        }
    });

    function collectNotesData() {
        const notesData = [];
        $('#notesTable tbody tr').each(function(index, row) {
            const noteId = $(row).find('input[name*="id"]').val();
            const noteText = $(row).find('textarea').val();
            const createdBy = $(row).find('input[name*="created_by"]').val();
            const deleteNote = $(row).find('input.delete-note').is(':checked');

            // If the note is marked for deletion, skip it
            if (!deleteNote && noteText) {
                notesData.push({
                    id: noteId,
                    note_text: noteText,
                    created_by: createdBy
                });
            } else if (deleteNote && noteId) {
                // Mark the note for deletion by setting a special key
                notesData.push({
                    id: noteId,
                    delete: true
                });
            }
        });

        // Handle the new note if it was added
        const newNoteText = $('#new_note').val().trim();
        if (newNoteText) {
            notesData.push({
                note_text: newNoteText,
                created_by: $('#current_user').val()  // Assuming `current_user` holds the username or id of the current user
            });
        }

        return notesData;
    }

    // Step 1: Handle type selection
    $('#select-regular-time').click(function() {
        $('#step1').hide();
        $('#step2-regular').show();
        $('#submitForm').show();
        $('#backToStep1').show();
    });

    $('#select-vacation').click(function() {
        $('#step1').hide();
        $('#step2-vacation').show();
        $('#submitForm').show();
        $('#backToStep1').show();
    });

    $('#select-holiday').click(function() {
        $('#step1').hide();
        $('#step2-holiday').show();
        $('#submitForm').show();
        $('#backToStep1').show();
    });

    $('#select-sick').click(function() {  // New button for sick entry
        $('#step1').hide();
        $('#step2-sick').show();
        $('#submitForm').show();
        $('#backToStep1').show();
    });

    // Back button to return to step 1
    $('#backToStep1').click(function() {
        $('#step2-regular').hide();
        $('#step2-vacation').hide();
        $('#step2-holiday').hide();  // Hide holiday form
        $('#step2-sick').hide();  // Hide sick form
        $('#step1').show();
        $('#submitForm').hide();
        $('#backToStep1').hide();
    });

    // Step 2: Handle form submission
    $('#submitForm').click(function() {
        let data = {};
        let formType = '';
        let url = '';
        const createdBy = $('#current_user').val();  // Get the current logged-in user

        if ($('#step2-regular').is(':visible')) {
            formType = 'regular';
            url = $('#regularTimeForm').attr('action');
            data = {
                employee_id: $('#employee_id_regular').val(),
                clock_in_time: $('#clock_in_time').val(),
                clock_out_time: $('#clock_out_time').val(),
                is_vacation: $('#is_vacation').is(':checked'),  // Capture the vacation checkbox
                notes: [{ note_text: $('#notes').val(), created_by: createdBy }]  // Send notes as a list of dictionaries
            };
        } else if ($('#step2-vacation').is(':visible')) {
            formType = 'vacation';
            url = $('#vacationForm').attr('action');
            data = {
                employee_id_vacation: $('#employee_id_vacation').val(),
                start_date: $('#start_date_vacation').val(),
                end_date: $('#end_date_vacation').val(),
                notes: [{ note_text: $('#vacation_notes').val(), created_by: createdBy }]  // Send notes as a list of dictionaries
            };
        } else if ($('#step2-holiday').is(':visible')) {  // New form handling
            formType = 'holiday';
            url = $('#holidayForm').attr('action');
            data = {
                employee_ids: $('#employee_id_holiday').val(),  // Assuming a multi-select field
                start_date: $('#start_date_holiday').val(),
                end_date: $('#end_date_holiday').val(),
                notes: [{ note_text: $('#holiday_notes').val(), created_by: createdBy }]  // Send notes as a list of dictionaries
            };
        } else if ($('#step2-sick').is(':visible')) {  // Sick time form handling
            formType = 'sick';
            url = $('#sickTimeForm').attr('action');
            data = {
                employee_id_sick: $('#employee_id_sick').val(),
                clock_in_time: $('#clock_in_time_sick').val(),
                clock_out_time: $('#clock_out_time_sick').val(),
                notes: [{ note_text: $('#sick_notes').val(), created_by: createdBy }]
            };
        }

        if (validateForm(data, formType)) {
            $.ajax({
                url: url,
                type: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken()  // Include CSRF token in the request
                },
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: function(response) {
                    if (response.status === 'success') {
                        location.reload();  // Reload the page to show the updated time entry
                    } else if (response.status === 'error') {
                        // Show an error message when there's an issue
                        alert(response.message);  // Use a custom UI component here instead of alert if preferred
                    }
                },
                error: function(xhr, status, error) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        alert('Error: ' + (response.message || 'Unknown error occurred while saving time entry.'));
                    } catch (e) {
                        alert('Unexpected error occurred. Please try again.');
                        console.error('Error parsing JSON response:', e);
                    }
                }
            });
        }
    });

    // Handle the remove button click
    $('.button-remove').click(function() {
        const entryId = $(this).data('id');
        const url = '/admin-dashboard/remove-time-entry/' + entryId + '/';
        const clockInDate = $(this).closest('tr').find('.in-date').text().trim();  // Adjust the selector based on your table structure
        const clockOutTime = $(this).closest('tr').find('.out-time').text().trim();  // Adjust the selector based on your table structure
        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            data: JSON.stringify({
                clock_in_date: clockInDate,
                clock_out_time: clockOutTime
            }),
            contentType: 'application/json',
            success: function(response) {
                if (response.status === 'success') {
                    location.reload();  // Reload the page to show the updated entries
                } else {
                    location.reload();
                }
            },
            error: function(xhr, status, error) {
                location.reload();
            }
        });
    });
    // Reset modal when it is closed
    $('#addTimeEntryModal').on('hidden.bs.modal', function() {
        $('#step1').show();
        $('#step2-regular').hide();
        $('#step2-vacation').hide();
        $('#step2-holiday').hide();  // Hide holiday form
        $('#step2-sick').hide();  // Hide sick form
        $('#submitForm').hide();
        $('#backToStep1').hide();
    });

    // Handle the vacation checkbox logic
    $('#is_vacation').change(function() {
        if ($(this).is(':checked')) {
            // Uncheck and disable the clocked-in toggle if vacation is selected
            $('#toggle-clocked-in').prop('checked', false).prop('disabled', true);
            $('#clock-out-time-group').show();  // Ensure clock-out field is visible
        } else {
            // Re-enable the clocked-in toggle if vacation is unselected
            $('#toggle-clocked-in').prop('disabled', false);
            toggleClockedIn(document.getElementById('toggle-clocked-in'));  // Reset clock-in behavior
        }
    });

    // Function to toggle the visibility of the Clock Out Time field
    function toggleClockedIn(checkbox) {
        const clockOutContainer = document.getElementById('clock-out-time-group');
        clockOutContainer.style.display = checkbox.checked ? 'none' : 'block';
    }

    // Initialize checkbox state on page load
    document.addEventListener('DOMContentLoaded', function() {
        const checkbox = document.getElementById('toggle-clocked-in');
        toggleClockedIn(checkbox); // Set the initial state of the Clock Out Time field
    });

    // Handle the clocked-in checkbox state changes
    $('#toggle-clocked-in').change(function() {
        toggleClockedIn(this);
    });

	// Function to toggle the visibility of the Edit Clock Out Time field
	function toggleClockedInEdit(checkbox) {
		const clockOutContainerEdit = document.getElementById('edit_clock_out_time_container');
		const clockOutTimeInputEdit = document.getElementById('edit_clock_out_time');
		
		if (checkbox.checked) {
			// Hide the Clock Out Time input and reset its value when checked
			clockOutContainerEdit.style.display = 'none';
			clockOutTimeInputEdit.value = '';  // Clear the Clock Out Time value
		} else {
			// Show the Clock Out Time input when unchecked
			clockOutContainerEdit.style.display = 'block';
		}
	}
	
	// Handle the Edit clocked-in checkbox state changes
	$('#toggle-clocked-in-edit').change(function() {
		toggleClockedInEdit(this);
	});
	document.getElementById('holiday_type').addEventListener('change', function() {
		var selectedValue = this.value;
		document.getElementById('holiday_notes').value = selectedValue;
	});
});
