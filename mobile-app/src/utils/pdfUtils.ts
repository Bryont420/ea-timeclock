/**
 * @fileoverview PDF generation utilities for time entry reports.
 * Provides functions for creating formatted PDF reports of employee time entries
 * with support for pagination, text wrapping, and complex layouts.
 */

import { format } from 'date-fns';

/**
 * Dynamically imports jsPDF library to reduce initial bundle size.
 * @returns Promise resolving to jsPDF constructor
 */
const loadJsPDF = async () => {
  const { default: jsPDF } = await import(/* webpackChunkName: "jspdf" */ 'jspdf');
  return { jsPDF };
};

/**
 * Time entry record structure for PDF generation
 */
interface TimeEntry {
    id: number;
    employee_name: string;
    clock_in_time: string;
    clock_out_time: string | null;
    clock_in_time_formatted: string;
    clock_out_time_formatted: string | null;
    hours_worked_display: string;
    notes_display?: Array<{
        created_by: string;
        note_text: string;
    }>;
}

/**
 * Options for text positioning and alignment in PDF
 */
interface PDFTextOptions {
    align?: 'left' | 'center' | 'right';
}

/**
 * Wraps text to fit within a specified width.
 * Splits text into lines that fit within the maximum width,
 * preserving word boundaries.
 * 
 * @param doc - jsPDF document instance
 * @param text - Text to wrap
 * @param maxWidth - Maximum width in document units
 * @returns Array of wrapped text lines
 */
const wrapText = (doc: any, text: string, maxWidth: number): string[] => {
    const textLines = text.split('\n');
    const resultLines: string[] = [];

    textLines.forEach(line => {
        const words = line.split(' ');
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = doc.getTextDimensions(currentLine + ' ' + word).w;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                resultLines.push(currentLine);
                currentLine = word;
            }
        }
        resultLines.push(currentLine);
    });

    return resultLines;
};

/**
 * Draws a cell in the PDF document with text alignment and wrapping support.
 * 
 * @param doc - jsPDF document instance
 * @param text - Text content for the cell
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param width - Cell width
 * @param height - Cell height
 * @param align - Text alignment ('left', 'center', 'right')
 * @param allowWrap - Whether to enable text wrapping
 * @returns Actual height used by the cell
 */
const drawCell = (
    doc: any, 
    text: string, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    align: 'left' | 'center' | 'right' = 'left',
    allowWrap: boolean = false
): number => {
    const lineHeight = 10/72; // Convert font size to inches
    doc.setFontSize(10);
    
    if (!allowWrap) {
        let textX = x;
        if (align === 'center') {
            textX = x + width/2;
        } else if (align === 'right') {
            textX = x + width - 0.1; 
        } else {
            textX = x + 0.1; 
        }

        doc.text(text, textX, y + (height + lineHeight)/2, { align });
        return height;
    } else {
        const maxWidth = width - 0.1; 
        const lines = wrapText(doc, text, maxWidth);
        const totalHeight = Math.max(height, (lines.length * lineHeight) + 0.1); 
        
        lines.forEach((line, index) => {
            let textX = x;
            if (align === 'center') {
                textX = x + width/2;
            } else if (align === 'right') {
                textX = x + width - 0.1; 
            } else {
                textX = x + 0.1; 
            }
            
            doc.text(line, textX, y + ((index + 1) * lineHeight) + 0.05, { align }); 
        });
        
        return totalHeight;
    }
};

/**
 * Draws a table header with column titles.
 * 
 * @param doc - jsPDF document instance
 * @param x - Starting X coordinate
 * @param y - Starting Y coordinate
 * @param columns - Array of column definitions with headers and widths
 * @returns Y coordinate after drawing the header
 */
const drawHeader = (
    doc: any, 
    x: number, 
    y: number, 
    columns: { header: string; width: number; }[]
): number => {
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    
    let currentX = x;
    const rowHeight = 0.25; 
    
    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        doc.setFillColor(128, 128, 128);
        doc.rect(currentX, y, col.width, rowHeight, 'F');
        drawCell(doc, col.header, currentX, y, col.width, rowHeight, 'center');
        currentX += col.width;
    }
    
    doc.setTextColor(0, 0, 0);
    return y + rowHeight;
};

/**
 * Groups time entries by employee name.
 * 
 * @param entries - Array of time entries
 * @returns Map of employee names to their time entries
 */
const groupEntriesByEmployee = (entries: TimeEntry[]) => {
    const grouped = new Map<string, TimeEntry[]>();
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const key = entry.employee_name;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(entry);
    }
    return grouped;
};

/**
 * Sorts time entries by clock-in date.
 * 
 * @param entries - Array of time entries
 * @returns Sorted array of time entries
 */
const sortEntriesByDate = (entries: TimeEntry[]): TimeEntry[] => {
    return [...entries].sort((a, b) => {
        const dateA = new Date(a.clock_in_time);
        const dateB = new Date(b.clock_in_time);
        return dateA.getTime() - dateB.getTime();
    });
};

/**
 * Converts hours worked string (e.g., "8H 30M") to total minutes.
 * 
 * @param hoursWorkedStr - Hours worked in string format
 * @returns Total minutes worked
 */
const convertHoursWorkedToMinutes = (hoursWorkedStr: string): number => {
    if (!hoursWorkedStr) return 0;
    const parts = hoursWorkedStr.split(' ');
    let hours = 0, minutes = 0;
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.includes('H')) {
            hours = parseInt(part.replace('H', ''));
        } else if (part.includes('M')) {
            minutes = parseInt(part.replace('M', ''));
        }
    }
    
    return hours * 60 + minutes;
};

/**
 * Converts total minutes to hours and minutes string format.
 * 
 * @param totalMinutes - Total number of minutes
 * @returns Formatted string (e.g., "8H 30M")
 */
const convertMinutesToHoursAndMinutes = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}H ${minutes}M`;
};

/**
 * Generates a PDF report of time entries grouped by employee.
 * Features:
 * - Automatic pagination
 * - Text wrapping for notes
 * - Subtotals per employee
 * - Formatted dates and times
 * - Header and footer on each page
 * 
 * @param timeEntries - Array of time entries to include in report
 */
export const generateTimeEntriesPDF = async (timeEntries: TimeEntry[]): Promise<void> => {
    const { jsPDF } = await loadJsPDF();
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
    });
    
    const margin = 0.25;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = 7.0;
    const columns = [
        { header: 'Date', width: 1.1 },
        { header: 'Time In', width: 0.8 },
        { header: 'Time Out', width: 0.8 },
        { header: 'Hours', width: 1.1 },
        { header: 'Notes', width: 3.2 }
    ];
    const minRowHeight = 0.25;
    const titleMargin = 0.5;
    const sectionSpacing = 0.2;
    const bottomMargin = 0.25;
    const continuedPageTopMargin = 0.5;
    
    doc.setLineWidth(0.01);
    
    doc.setFontSize(18);
    const titleOptions: PDFTextOptions = { align: 'center' };
    doc.text("Payroll Report", pageWidth / 2, titleMargin, titleOptions);
    
    const groupedEntries = groupEntriesByEmployee(timeEntries);
    let currentY = titleMargin + 0.5;
    
    // Convert Map entries to array for safer iteration
    const employeeEntries = Array.from(groupedEntries.entries());
    
    for (let i = 0; i < employeeEntries.length; i++) {
        const [employeeName, entries] = employeeEntries[i];
        const sortedEntries = sortEntriesByDate(entries);
        
        let totalHeight = 0.5; 
        const rowHeights = sortedEntries.map(entry => {
            const notes = entry.notes_display?.map(note => 
                `${note.created_by}: ${note.note_text}`
            ).join('\n') || '';
            const wrappedNotes = wrapText(doc, notes, columns[4].width - 0.1);
            return Math.max(minRowHeight, (wrappedNotes.length * (10/72)) + 0.1);
        });
        
        totalHeight += rowHeights.reduce((sum, height) => sum + height, 0);
        totalHeight += 0.5; 
        
        if (currentY > titleMargin + 0.5 && currentY + Math.min(totalHeight, pageHeight - 1) > pageHeight - bottomMargin) {
            doc.addPage();
            currentY = continuedPageTopMargin;
        }
        
        let isFirstPage = true;
        let remainingEntries = [...sortedEntries];
        
        while (remainingEntries.length > 0) {
            doc.setFontSize(14);
            if (isFirstPage) {
                doc.text(`Employee: ${employeeName}`, margin, currentY);
            } else {
                doc.text(`Employee: ${employeeName} (Continued)`, margin, currentY);
            }
            currentY += sectionSpacing;
            
            currentY = drawHeader(doc, margin, currentY, columns);
            
            const startY = currentY;
            const entriesForThisPage: TimeEntry[] = [];
            
            while (remainingEntries.length > 0) {
                const entry = remainingEntries[0];
                const notes = entry.notes_display?.map(note => 
                    `${note.created_by}: ${note.note_text}`
                ).join('\n') || '';
                
                const wrappedNotes = wrapText(doc, notes, columns[4].width - 0.1);
                const rowHeight = Math.max(minRowHeight, (wrappedNotes.length * (10/72)) + 0.1);
                
                if (currentY + rowHeight > pageHeight - bottomMargin) {
                    break;
                }
                
                entriesForThisPage.push(entry);
                remainingEntries.shift();
                currentY += rowHeight;
            }
            
            currentY = startY;
            doc.setFontSize(10);
            
            for (let i = 0; i < entriesForThisPage.length; i++) {
                const entry = entriesForThisPage[i];
                const clockInDate = new Date(entry.clock_in_time);
                const notes = entry.notes_display?.map(note => 
                    `${note.created_by}: ${note.note_text}`
                ).join('\n') || '';
                
                let currentX = margin;
                const rowData = [
                    format(clockInDate, 'EEE MM/dd'),
                    entry.clock_in_time_formatted,
                    entry.clock_out_time_formatted || '',
                    entry.hours_worked_display,
                    notes
                ];
                
                const wrappedNotes = wrapText(doc, notes, columns[4].width - 0.1);
                const rowHeight = Math.max(minRowHeight, (wrappedNotes.length * (10/72)) + 0.1);
                
                doc.setFillColor(245, 245, 220);
                doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
                
                for (let j = 0; j < columns.length; j++) {
                    const col = columns[j];
                    drawCell(
                        doc, 
                        rowData[j], 
                        currentX, 
                        currentY, 
                        col.width, 
                        rowHeight, 
                        j < 4 ? 'center' : 'left',
                        j === 4
                    );
                    currentX += col.width;
                }
                
                currentX = margin;
                for (let j = 0; j < columns.length; j++) {
                    const col = columns[j];
                    doc.setDrawColor(0);
                    doc.rect(currentX, currentY, col.width, rowHeight);
                    currentX += col.width;
                }
                
                currentY += rowHeight;
            }
            
            if (remainingEntries.length === 0) {
                const totalMinutes = sortedEntries.reduce((total, entry) => 
                    total + convertHoursWorkedToMinutes(entry.hours_worked_display), 0);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                const totalText = `Total Hours: ${convertMinutesToHoursAndMinutes(totalMinutes)}`;
                
                const hoursColumnX = margin + columns[0].width + columns[1].width + columns[2].width;
                doc.text(totalText, hoursColumnX + columns[3].width/2, currentY + 0.15, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                
                currentY += 0.35;
            }
            
            if (remainingEntries.length > 0) {
                doc.addPage();
                currentY = continuedPageTopMargin;
                isFirstPage = false;
            }
        }
    }
    
    const currentDate = format(new Date(), 'MM-dd-yy');
    doc.save(`Payroll ${currentDate}.pdf`);
};
