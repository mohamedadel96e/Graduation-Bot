import { google } from 'googleapis';
import { ENV } from '../config';

type EnvShape = typeof ENV;

export function getSheetsClient(env: EnvShape = ENV) {
    const auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

/**
 * Helper to test the connection to the Google Sheet.
 */
export async function testSheetConnection(env: EnvShape = ENV) {
    try {
        const sheets = getSheetsClient(env);
        const response = await sheets.spreadsheets.get({
            spreadsheetId: env.GOOGLE_SHEET_ID,
        });
        console.log(`Successfully connected to Google Sheet: ${response.data.properties?.title}`);
        return true;
    } catch (error) {
        console.error('Failed to connect to Google Sheets:', error);
        return false;
    }
}
