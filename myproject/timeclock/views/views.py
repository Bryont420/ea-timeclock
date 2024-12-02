from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.units import inch  # Import inch to define column widths
from io import BytesIO
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import pytz
from ..models import Employee, TimeEntry, Note

# Force initialization of _strptime
import time
time.strptime('01', '%d')  # Dummy call

# PDF utility functions
def convert_hours_worked_to_minutes(hours_worked_str):
    """Convert hours worked from 'HHH MM' string to total minutes."""
    if not hours_worked_str:
        return 0
    hours, minutes = 0, 0
    parts = hours_worked_str.split()
    for part in parts:
        if 'H' in part:
            hours += int(part.replace('H', ''))
        elif 'M' in part:
            minutes += int(part.replace('M', ''))
    return hours * 60 + minutes

def convert_minutes_to_hours_and_minutes(total_minutes):
    """Convert total minutes to 'HHH MM' string."""
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{int(hours)}H {int(minutes)}M"

def generate_pdf(request):
    is_pyqt_client = request.COOKIES.get('pyqt_client') == 'true'
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')

    if not start_date_str or not end_date_str:
        return HttpResponse("Start date and end date are required.", status=400)

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return HttpResponse("Invalid date format.", status=400)

    # Set timezone
    tz = pytz.timezone('America/New_York')

    # Use timezone-aware datetime for filtering
    start_datetime = tz.localize(datetime.combine(start_date, datetime.min.time()))
    end_datetime = tz.localize(datetime.combine(end_date, datetime.max.time()))

    time_entries = TimeEntry.objects.filter(
        clock_in_time__date__range=[start_datetime.date(), end_datetime.date()]
    ).select_related('employee').prefetch_related('notes')

    # Create a PDF document with reduced margins
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter, 
        topMargin=20,
        bottomMargin=0
    )

    doc.title = "Payroll Report"

    # Create styles for the PDF
    styles = getSampleStyleSheet()
    styleN = styles['Normal']
    styleH = styles['Heading1']
    styleH.alignment = 1  # Center align the heading

    # Create a custom style for notes that supports word wrapping
    note_style = ParagraphStyle(name='NoteStyle', wordWrap='CJK', fontSize=10)

    # Build the content for the PDF
    content = []

    # Group entries by employee
    employees = sorted(set(entry.employee for entry in time_entries), key=lambda e: e.last_name)
    for employee in employees:
        employee_entries = [entry for entry in time_entries if entry.employee == employee]

        # Define fixed column widths (Removed the 'Full Day' column)
        column_widths = [1.1 * inch, 0.8 * inch, 0.8 * inch, 1.1 * inch, 2.5 * inch]  # Adjust as needed

        # Table data (removed "Full Day" column)
        data = [['Date', 'Time In', 'Time Out', 'Hours Worked', 'Notes']]
        total_hours_seconds = 0
        day_entries = {}

        # Process each entry for the employee
        for entry in employee_entries:
            date_key = entry.clock_in_time.date()
            if date_key not in day_entries:
                day_entries[date_key] = {
                    'entries': []
                }
            day_entries[date_key]['entries'].append(entry)

        # Calculate hours worked
        for date_key, details in day_entries.items():
            daily_entries = details['entries']
            daily_total_hours = timedelta()

            for i, entry in enumerate(daily_entries):
                hours_worked_decimal = float(entry.hours_worked) if isinstance(entry.hours_worked, Decimal) else entry.hours_worked
                hours_worked_timedelta = timedelta(hours=hours_worked_decimal)
                daily_total_hours += hours_worked_timedelta

                # Add entry to data for the PDF
                clock_in = entry.clock_in_time.astimezone(tz).strftime('%a %m/%d')
                clock_in_time = entry.clock_in_time.astimezone(tz).strftime('%I:%M %p')
                clock_out_time = entry.clock_out_time.astimezone(tz).strftime('%I:%M %p') if entry.clock_out_time else ''
                total_minutes = hours_worked_timedelta.total_seconds() / 60

                hours_worked_str = convert_minutes_to_hours_and_minutes(total_minutes)

                # Fetch the notes for this entry and concatenate them, wrap them using Paragraph
                notes_text = " | ".join([note.note_text for note in entry.notes.all()])
                notes_paragraph = Paragraph(notes_text, note_style)

                # Add the entry to the data (without the 'Full Day' column)
                data.append([clock_in, clock_in_time, clock_out_time, hours_worked_str, notes_paragraph])

            total_hours_seconds += daily_total_hours.total_seconds()  # Add daily total to the overall total

        # Add a blank row
        data.append(['', '', '', '', ''])
        # Convert total_hours_seconds to hours and minutes
        total_hours_str = convert_minutes_to_hours_and_minutes(total_hours_seconds / 60)
        data.append(['Total Hours:', '', '', total_hours_str, ''])  # Adjust for 4 merged cells and total hours

        # Create the table and add it to the content
        table = Table(data, colWidths=column_widths)  # Set fixed column widths

        # Update table styles
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('BACKGROUND', (0, len(data) - 2), (-1, len(data) - 2), colors.white),  # Blank row background
            ('BACKGROUND', (0, len(data) - 1), (-1, len(data) - 1), colors.beige),  # Total hours row background
            ('ALIGN', (0, len(data) - 1), (0, len(data) - 1), 'RIGHT'),  # Align "Total Hours:" text to the right
            ('SPAN', (0, len(data) - 1), (2, len(data) - 1)),  # Merge the first 3 cells for "Total Hours:"
            ('GRID', (0, 0), (-1, -1), 1, colors.black),  # Grid for all cells
            ('GRID', (0, len(data) - 1), (-1, len(data) - 1), 1, colors.black),
            ('LINEABOVE', (0, len(data) - 1), (-1, len(data) - 1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),  # Ensure vertical alignment is at the top
        ]))

        content.append(KeepTogether([
            Paragraph(f'Employee: {employee.first_name} {employee.last_name}', styleH),
            table,
            Spacer(1, 10),
        ]))

    # Get current date for filename
    current_date = datetime.now().strftime('%m-%d-%y')
    filename = f'Payroll {current_date}.pdf'

    doc.build(content)
    buffer.seek(0)

    # Set the Content-Disposition header based on the cookie
    if is_pyqt_client:
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
    else:
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
