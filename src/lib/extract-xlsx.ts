import * as XLSX from 'xlsx';

/**
 * Converts a .xlsx Buffer into structured tabular text (used in AI)
 * @param buffer Buffer of the Excel file
 * @returns Text with headers and rows separated by tabs and newlines
 */
export async function extractTextFromXlsx(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('The spreadsheet is empty.');
    }
    const sheet = workbook.Sheets[sheetName];

    const json: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1, // Returns an array of arrays with all cells
      blankrows: false,
    });

    if (!json || json.length === 0) {
      throw new Error('The spreadsheet is empty.');
    }

    // Builds a tabular string with newlines
    const text = json
      .map((row) => row.map(cell => String(cell ?? '')).join('\t')) // separates by tabulation
      .join('\n');

    return text;
  } catch (error) {
    console.error('Error converting spreadsheet:', error);
    throw new Error('Error reading the spreadsheet content. Check if the file is in a valid .xlsx format.');
  }
}
