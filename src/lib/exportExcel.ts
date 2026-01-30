import { utils, write } from 'xlsx';

export interface AttendanceExportData {
  'Employee Name': string;
  'Date': string;
  'Check-In Time': string;
  'Status': string;
  'Late Minutes': number;
  'Device ID': string;
}

export interface LeadExportData {
  'Lead Name': string;
  'Project': string;
  'Email': string;
  'Phone': string;
  'Status': string;
  'Source': string;
  'Assigned To': string;
  'Notes': string;
}

export interface EmployeeExportData {
  'Employee Name': string;
  'Email': string;
  'Phone': string;
  'Position': string;
  'Salary': number;
  'Total Leads': number;
  'Closed Deals': number;
  'Conversion Rate': string;
}

/**
 * Export attendance records to Excel
 */
export function exportAttendanceToExcel(
  data: AttendanceExportData[],
  filename: string = 'attendance_records.xlsx'
) {
  const ws = utils.json_to_sheet(data);
  
  // Set column widths
  const colWidths = [20, 15, 15, 12, 12, 20];
  ws['!cols'] = colWidths.map(width => ({ wch: width }));

  // Style header row
  const headerStyle = {
    fill: { fgColor: { rgb: 'FF366092' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FF000000' } },
      bottom: { style: 'thin', color: { rgb: 'FF000000' } },
      left: { style: 'thin', color: { rgb: 'FF000000' } },
      right: { style: 'thin', color: { rgb: 'FF000000' } },
    },
  };

  const headerRange = utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = utils.encode_col(col) + '1';
    if (ws[cellAddress]) {
      ws[cellAddress].s = headerStyle;
    }
  }

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Attendance');
  
  // Create and trigger download
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename.replace('.xlsx', '') + '_' + timestamp + '.xlsx';
  
  // Create blob and download
  const blob = new Blob([Buffer.from(write(wb, { bookType: 'xlsx', type: 'binary' }), 'binary')], 
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export leads to Excel
 */
export function exportLeadsToExcel(
  data: LeadExportData[],
  filename: string = 'leads.xlsx'
) {
  const ws = utils.json_to_sheet(data);
  
  // Set column widths
  const colWidths = [20, 20, 20, 15, 15, 20, 30];
  ws['!cols'] = colWidths.map(width => ({ wch: width }));

  // Style header row
  const headerStyle = {
    fill: { fgColor: { rgb: 'FF1F2937' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FF000000' } },
      bottom: { style: 'thin', color: { rgb: 'FF000000' } },
      left: { style: 'thin', color: { rgb: 'FF000000' } },
      right: { style: 'thin', color: { rgb: 'FF000000' } },
    },
  };

  const headerRange = utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = utils.encode_col(col) + '1';
    if (ws[cellAddress]) {
      ws[cellAddress].s = headerStyle;
    }
  }

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Leads');
  
  // Create blob and download
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename.replace('.xlsx', '') + '_' + timestamp + '.xlsx';
  
  const blob = new Blob([Buffer.from(write(wb, { bookType: 'xlsx', type: 'binary' }), 'binary')], 
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export employees to Excel
 */
export function exportEmployeesToExcel(
  data: EmployeeExportData[],
  filename: string = 'employees.xlsx'
) {
  const ws = utils.json_to_sheet(data);
  
  // Set column widths
  const colWidths = [20, 25, 15, 15, 15, 12, 12, 15];
  ws['!cols'] = colWidths.map(width => ({ wch: width }));

  // Style header row
  const headerStyle = {
    fill: { fgColor: { rgb: 'FF4B5563' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FF000000' } },
      bottom: { style: 'thin', color: { rgb: 'FF000000' } },
      left: { style: 'thin', color: { rgb: 'FF000000' } },
      right: { style: 'thin', color: { rgb: 'FF000000' } },
    },
  };

  const headerRange = utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = utils.encode_col(col) + '1';
    if (ws[cellAddress]) {
      ws[cellAddress].s = headerStyle;
    }
  }

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Employees');
  
  // Create blob and download
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename.replace('.xlsx', '') + '_' + timestamp + '.xlsx';
  
  const blob = new Blob([Buffer.from(write(wb, { bookType: 'xlsx', type: 'binary' }), 'binary')], 
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
