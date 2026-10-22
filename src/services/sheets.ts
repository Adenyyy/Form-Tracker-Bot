import { auth, sheets as sheetsApi, sheets_v4 } from "@googleapis/sheets";
import fs from "fs";
import path from "path";
import { client } from "../index.js";

export interface SheetTable {
    headers: string[];
    rows: Record<string, string>[];
}

let api: sheets_v4.Sheets;

function credentialsFile(): string {
    return path.resolve(process.cwd(), client.config.google?.credentials_file ?? "./service-account.json");
}

function getApi(): sheets_v4.Sheets {
    if (api) return api;
    const googleAuth = new auth.GoogleAuth({
        keyFile: credentialsFile(),
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    api = sheetsApi({ version: "v4", auth: googleAuth });
    return api;
}

// Quotes a tab name for A1 notation ('My Tab' -> "'My Tab'")
function quoteTab(tab: string): string {
    return `'${tab.replace(/'/g, "''")}'`;
}

const sheets = {

    // The email people share their sheets with
    serviceAccountEmail(): string | null {
        try {
            return JSON.parse(fs.readFileSync(credentialsFile(), "utf8")).client_email ?? null;
        } catch {
            return null;
        }
    },

    // Accepts a full Google Sheets link or a bare spreadsheet ID
    parseUrl(input: string): { id: string; gid: number | null } | null {
        const trimmed = input.trim();
        const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        const id = idMatch?.[1] ?? (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed) ? trimmed : null);
        if (!id) return null;
        const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
        return { id, gid: gidMatch ? Number(gidMatch[1]) : null };
    },

    // Finds the tab title for a gid, or the first tab when no gid is given
    async resolveTab(spreadsheetId: string, gid: number | null): Promise<{ title: string; spreadsheetTitle: string }> {
        const res = await getApi().spreadsheets.get({ spreadsheetId, fields: "properties.title,sheets.properties(sheetId,title)" });
        const tabs = res.data.sheets ?? [];
        const tab = gid === null ? tabs[0] : tabs.find(sheet => sheet.properties?.sheetId === gid);
        if (!tab?.properties?.title) throw new Error(gid === null ? "The spreadsheet has no tabs" : `No tab with gid ${gid} was found`);
        return { title: tab.properties.title, spreadsheetTitle: res.data.properties?.title ?? "Untitled" };
    },

    // Reads a whole tab, using the first row as headers
    async readTable(spreadsheetId: string, tab: string): Promise<SheetTable> {
        const res = await getApi().spreadsheets.values.get({ spreadsheetId, range: quoteTab(tab), valueRenderOption: "FORMATTED_VALUE" });
        const [headerRow = [], ...dataRows] = res.data.values ?? [];
        const headers = headerRow.map(header => String(header ?? "").trim());
        const rows = dataRows
            .filter(row => row.some(cell => String(cell ?? "").trim() !== ""))
            .map(row => Object.fromEntries(headers.map((header, i) => [header, String(row[i] ?? "").trim()])));
        return { headers, rows };
    },

    async readHeaders(spreadsheetId: string, tab: string): Promise<string[]> {
        const res = await getApi().spreadsheets.values.get({ spreadsheetId, range: `${quoteTab(tab)}!1:1` });
        return (res.data.values?.[0] ?? []).map(header => String(header ?? "").trim()).filter(Boolean);
    },

    // Turns a Google API error into something worth showing in Discord
    describeError(e: any): string {
        const status = e?.code ?? e?.response?.status;
        const reason = e?.errors?.[0]?.reason ?? e?.response?.data?.error?.status;
        if (status === 403 && /SERVICE_DISABLED|accessNotConfigured/i.test(`${reason} ${e?.message}`)) return "The Google Sheets API isn't enabled for the bot's Google Cloud project. The bot owner needs to enable it.";
        if (status === 403) return `The bot can't open that sheet. Share it with \`${sheets.serviceAccountEmail() ?? "the service account"}\` as a Viewer. If your Google account belongs to a school or work organization, it may block sharing outside the organization.`;
        if (status === 404) return "That spreadsheet doesn't exist. Check the link.";
        if (status === 400 && /not supported for this document/i.test(e?.message ?? "")) return "That file is an Excel (.xlsx) file, not a Google Sheet. Open it and use File → Save as Google Sheets, then link the new sheet.";
        if (e?.code === "ENOENT") return "The bot's Google credentials file is missing. The bot owner needs to set `google.credentials_file` in settings.yml.";
        return `Google Sheets error: ${e?.message ?? e}`;
    }

};

export default sheets;
