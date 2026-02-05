import { utils, write } from 'xlsx';
// ExcelJS can cause bundler/runtime issues in the browser. We'll dynamically import
// the browser build and polyfill `Buffer` when running client-side.
// Do NOT statically import ExcelJS here.

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

export interface CommissionExportData {
  'Deal Name': string;
  'Project': string;
  'Commission Rate': string;
  'Commission Amount': number;
  'Status': string;
  'Submitted': string;
  'Approved Date': string;
  'Rejection Note': string;
}

export async function exportCommissionsToExcel(
  data: CommissionExportData[],
  filename: string = 'commissions.xlsx'
) {
  if (!data || data.length === 0) return;

  // Dynamic imports + polyfills for browser environment
  let ExcelJS: any = null;
  if (typeof window !== 'undefined') {
    // Ensure Buffer is available (some bundlers remove Node Buffer)
    if (!(window as any).Buffer) {
      try {
        const bufMod = await import('buffer');
        (window as any).Buffer = bufMod.Buffer;
      } catch (err) {
        // ignore — some environments already provide Buffer
      }
    }

    // Try to import the browser build first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ExcelJS = (await import('exceljs/dist/exceljs.min.js')).default || (await import('exceljs')).default;
    } catch (err) {
      ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
    }
  } else {
    // Server-side
    ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Commissions');

  // Build headers from keys (keep order)
  const headers = Object.keys(data[0]);

  // Add header row (avoid assigning sheet.columns directly to prevent exceljs expecting Column instances)
  sheet.addRow(headers);
  // Set header styles
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } } as any;
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } } as any;
  // Set default widths
  headers.forEach((h, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = 30;
  });

  // Add rows and collect image rows (support multiple URLs)
  const imageRows: { rowNumber: number; urls: string[] }[] = [];
  for (const rowObj of data) {
    const rowValues = headers.map((h) => {
      if (h === 'AttachmentUrls' || h === 'AttachmentUrl' || h === 'attachmentUrls' || h === 'attachments') return '';
      return (rowObj as any)[h] ?? '';
    });
    const row = sheet.addRow(rowValues);
    const currentRowNumber = row.number;
    // Collect possible url(s)
    let urls: string[] = [];
    if (Array.isArray((rowObj as any).AttachmentUrls)) urls = (rowObj as any).AttachmentUrls;
    else if (Array.isArray((rowObj as any).attachments)) urls = (rowObj as any).attachments;
    else if ((rowObj as any).AttachmentUrl) urls = [(rowObj as any).AttachmentUrl];
    else if ((rowObj as any).attachmentUrl) urls = [(rowObj as any).attachmentUrl];

    if (urls.length > 0) {
      imageRows.push({ rowNumber: currentRowNumber, urls });
      sheet.getRow(currentRowNumber).height = 90;
    }
  }

  // Helper to convert ArrayBuffer to base64
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // Embed images (if any)
  for (const imgRow of imageRows) {
    const urls = imgRow.urls || [];
    for (let i = 0; i < urls.length; i++) {
      const urlStr = urls[i];
      try {
        const res = await fetch(urlStr);
        if (!res.ok) throw new Error('Image fetch failed');
        const contentType = res.headers.get('content-type') || '';
        const arrayBuffer = await res.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        let ext = 'png';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpeg';
        else if (contentType.includes('gif')) ext = 'gif';

        const imageId = workbook.addImage({ base64, extension: ext });

        const imageColIndex = headers.findIndex((h) => h === 'AttachmentUrls' || h === 'AttachmentUrl' || h === 'attachmentUrls' || h === 'attachments');
        const baseIndex = imageColIndex >= 0 ? imageColIndex : headers.length; // zero-based
        const targetCol = baseIndex + i; // zero-based

        // Ensure sheet has enough columns and set header for new attachment columns
        while (sheet.columnCount <= targetCol) {
          const newColIndex = sheet.columnCount + 1; // 1-based
          sheet.getRow(1).getCell(newColIndex).value = `Attachment ${newColIndex - headers.length}`;
          sheet.getColumn(newColIndex).width = 22;
        }

        const tl = { col: targetCol, row: imgRow.rowNumber - 1 };
        sheet.addImage(imageId, { tl, ext: { width: 160, height: 110 } });
      } catch (err) {
        // on failure write URL into appropriate cell
        const colIndex = headers.findIndex((h) => h === 'AttachmentUrls' || h === 'AttachmentUrl' || h === 'attachmentUrls' || h === 'attachments');
        const baseIndex = colIndex >= 0 ? colIndex : headers.length;
        const cell = sheet.getRow(imgRow.rowNumber).getCell(baseIndex + i + 1);
        cell.value = urlStr;
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename.replace('.xlsx', '') + '_' + timestamp + '.xlsx';
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
