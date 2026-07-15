import type { sheets_v4 } from 'googleapis';
import { ENV } from '../config';
import type { SheetRow } from '../types';

export interface TableStore<T extends SheetRow> {
    findAll(): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    append(row: T): Promise<T>;
    updateById(id: string, patch: Partial<T>): Promise<T | null>;
}

export class GoogleSheetsTable<T extends SheetRow> implements TableStore<T> {
    constructor(
        private readonly sheets: sheets_v4.Sheets,
        private readonly sheetName: string,
        private readonly columns: readonly string[],
        private readonly spreadsheetId = ENV.GOOGLE_SHEET_ID,
    ) {}

    async findAll(): Promise<T[]> {
        const headers = await this.ensureHeaders();
        const values = await this.readValues();
        return values
            .slice(1)
            .filter((row) => row.some((value) => value.trim().length > 0))
            .map((row) => this.rowToObject(headers, row));
    }

    async findById(id: string): Promise<T | null> {
        const rows = await this.findAll();
        return rows.find((row) => row.id === id) ?? null;
    }

    async append(row: T): Promise<T> {
        await this.ensureHeaders();

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A:ZZ`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [this.columns.map((column) => row[column] ?? '')],
            },
        });

        return row;
    }

    async updateById(id: string, patch: Partial<T>): Promise<T | null> {
        const headers = await this.ensureHeaders();
        const values = await this.readValues();
        const idColumnIndex = headers.indexOf('id');

        if (idColumnIndex === -1) {
            throw new Error(`${this.sheetName} sheet is missing required "id" header.`);
        }

        const bodyRowIndex = values
            .slice(1)
            .findIndex((row) => row[idColumnIndex] === id);

        if (bodyRowIndex === -1) {
            return null;
        }

        const sheetRowNumber = bodyRowIndex + 2;
        const existing = this.rowToObject(headers, values[sheetRowNumber - 1] ?? []);
        const next = { ...existing, ...patch } as T;

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A${sheetRowNumber}:${toColumnName(headers.length)}${sheetRowNumber}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [headers.map((header) => next[header] ?? '')],
            },
        });

        return next;
    }

    private async ensureHeaders(): Promise<string[]> {
        const values = await this.readValues('1:1');
        const headers = values[0] ?? [];

        if (headers.length > 0) {
            const missingColumns = this.columns.filter((column) => !headers.includes(column));

            if (missingColumns.length === 0) {
                return headers;
            }

            const nextHeaders = [...headers, ...missingColumns];

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${this.sheetName}!A1:${toColumnName(nextHeaders.length)}1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [nextHeaders],
                },
            });

            return nextHeaders;
        }

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A1:${toColumnName(this.columns.length)}1`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[...this.columns]],
            },
        });

        return [...this.columns];
    }

    private async readValues(range = 'A:ZZ'): Promise<string[][]> {
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!${range}`,
        });

        return (response.data.values ?? []).map((row) => row.map((value) => String(value ?? '')));
    }

    private rowToObject(headers: string[], row: string[]): T {
        return headers.reduce<SheetRow>((record, header, index) => {
            record[header] = row[index] ?? '';
            return record;
        }, {}) as T;
    }
}

function toColumnName(columnCount: number): string {
    let dividend = columnCount;
    let columnName = '';

    while (dividend > 0) {
        const modulo = (dividend - 1) % 26;
        columnName = String.fromCharCode(65 + modulo) + columnName;
        dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
}
