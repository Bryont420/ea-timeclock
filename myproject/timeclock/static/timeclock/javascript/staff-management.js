$(document).ready(function() {
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    // Real-time password validation for Add Staff Modal
    $('#addStaffModal #password').on('input', function() {
        const password = $(this).val();
        validatePassword(password, '#');
    });

    // Real-time password validation for Edit Staff Modal
    $('#editStaffModal #edit_password').on('input', function() {
        const password = $(this).val();
        validatePassword(password, '#edit-');
    });

    function validatePassword(password, prefix) {
        const minLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);

        updatePasswordRequirement(prefix + 'min-length', minLength);
        updatePasswordRequirement(prefix + 'has-number', hasNumber);
        updatePasswordRequirement(prefix + 'has-uppercase', hasUppercase);
        updatePasswordRequirement(prefix + 'has-lowercase', hasLowercase);
        updatePasswordRequirement(prefix + 'has-special', hasSpecial);

        return minLength && hasNumber && hasUppercase && hasLowercase && hasSpecial;
    }

    function updatePasswordRequirement(selector, isValid) {
        $(selector).toggleClass('valid', isValid);
        $(selector).toggleClass('invalid', !isValid);
    }

    // Open the Add Staff Modal
    $('#toggle-add-staff-form-button').click(function() {
        $('#addStaffModal').modal('show');
    });

    // Handle Add Staff Form Submission
    $('#submitAddStaffForm').click(function() {
        const url = $('#addStaffForm').attr('action');
        const password = $('#password').val();

        if (!validatePassword(password, '')) {
            alert('Password does not meet the requirements.');
            return;
        }

        const data = {
            username: $('#username').val(),
            first_name: $('#first_name').val(),
            last_name: $('#last_name').val(),
            email: $('#email').val(),
            password: password,
        };

        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            data: data,
            beforeSend: function() {
                $('#loadingSpinner').show();
            },
            success: function(response) {
                if (response.status === 'success') {
                    location.reload();  // Reload the page to show the updated staff list
                } else {
                    alert(response.message);  // Show error message
                }
            },
            error: function(xhr, status, error) {
                alert('Error adding staff member.');
            },
            complete: function() {
                $('#loadingSpinner').hide();
            }
        });
    });

    // Open the Edit Staff Modal
    $('.edit-staff-button').click(function() {
        const staffId = $(this).data('id');
        const url = '/admin-dashboard/edit_staff/';
        
        $('#loadingSpinner').show();
        
        $.ajax({
            url: url,
            type: 'GET',
            success: function(data) {
                $('#edit_first_name').val(data.first_name);
                $('#edit_last_name').val(data.last_name);
                $('#edit_email').val(data.email);
                // Set the current background image
                if (data.background_image) {
                    $('#selected_background_image').val(data.background_image);
                } else {
                    $('#selected_background_image').val('');
                }

                $('#editStaffModal').modal('show');
                $('#loadingSpinner').hide();
            },
            error: function(xhr, status, error) {
                alert('Error loading staff member data.');
                $('#loadingSpinner').hide();
            }
        });
    });

    // Handle Edit Staff Form Submission
    $('#submitEditStaffForm').click(function() {
        const url = $('#editStaffForm').attr('action');
        const password = $('#edit_password').val();

        if (password && !validatePassword(password, 'edit-')) {
            alert('Password does not meet the requirements.');
            return;
        }

        const data = {
            first_name: $('#edit_first_name').val(),
            last_name: $('#edit_last_name').val(),
            email: $('#edit_email').val(),
            password: password,
            background_image: $('#selected_background_image').val(),
        };

        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            data: data,
            beforeSend: function() {
                $('#loadingSpinner').show();
            },
            success: function(response) {
                if (response.status === 'success') {
                    location.reload();  // Reload the page to show the updated staff list
                } else {
                    alert(response.message);  // Show error message
                }
            },
            error: function(xhr, status, error) {
                alert('Error updating staff member.');
            },
            complete: function() {
                $('#loadingSpinner').hide();
            }
        });
    });

    // Open the Background Modal from the Edit Staff Modal
    $('#open-background-modal').click(function() {
        $('#backgroundModal').modal('show');
    });

    // Handle click on the image to open preview modal
    $(document).on('click', '.background-thumbnail', function() {
        // Get the full-size image URL
        const fullsizeSrc = $(this).data('fullsize-src');

        // Show the enlarged image in the preview modal
        $('#image-preview').attr('src', fullsizeSrc);
        $('#imagePreviewModal').modal('show');
    });

    // Handle selection via radio buttons
    $(document).on('change', 'input[name="background_image_option"]', function() {
        // Remove 'selected' class from all thumbnails
        $('.thumbnail-container').removeClass('selected');

        // Add 'selected' class to the parent container of the selected radio button
        $(this).closest('.thumbnail-container').addClass('selected');

        // Set the selected image in the hidden input
        const selectedImage = $(this).val();
        $('#selected_background_image').val(selectedImage);
    });

    // Save selected background image
    $('#save-background').click(function() {
        const selectedImage = $('input[name="background_image_option"]:checked').val();

        if (!selectedImage) {
            alert('Please select a background image.');
            return;
        }

        // The selected image is already set in the hidden input by the radio button change handler

        // Close the Background Modal
        $('#backgroundModal').modal('hide');
    });

    // When Background Modal opens, highlight the current selection
    $('#backgroundModal').on('show.bs.modal', function () {
        // Clear previous selections
        $('.thumbnail-container').removeClass('selected');
        $('input[name="background_image_option"]').prop('checked', false);

        // Get the currently selected background image
        const currentBackgroundImage = $('#selected_background_image').val();

        if (currentBackgroundImage) {
            // Find the radio button with the current background image
            const $currentRadio = $('input[name="background_image_option"][value="' + currentBackgroundImage + '"]');
            if ($currentRadio.length) {
                $currentRadio.prop('checked', true);
                $currentRadio.closest('.thumbnail-container').addClass('selected');
            }
        }
    });
});
document.addEventListener("DOMContentLoaded", function() {
    var body = document.getElementById('employee-background');
    var backgroundUrl = body.getAttribute('data-background-url');
    if (backgroundUrl) {
        body.style.backgroundImage = 'url(' + backgroundUrl + ')';
    }
});