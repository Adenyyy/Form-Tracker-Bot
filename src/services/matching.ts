// Pure matching logic, kept free of Discord and Google so it can be tested on its own

export interface Member {
    name: string;
    matchValue: string; // as written in the sheet
    key: string; // normalized matchValue
    discord: string; // as written in the sheet (user ID or username)
}

export interface MatchColumns {
    memberName: string;
    memberMatch: string;
    memberDiscord: string | null;
    responseMatch: string;
}

export interface MatchResult {
    members: Member[]; // everyone tracked (exempt members excluded)
    submitted: Member[];
    missing: Member[];
    exempt: Member[];
    unmatched: string[]; // response values that match no member
    duplicateKeys: string[]; // match values that appear on more than one member row
}

// Case, surrounding whitespace and inner spaces don't count ("  A123 4 " == "a1234")
export function normalize(value: string): string {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function matchSubmissions(
    memberRows: Record<string, string>[],
    responseRows: Record<string, string>[],
    columns: MatchColumns,
    exemptKeys: Set<string>
): MatchResult {
    const responseKeys = new Map<string, string>();
    for (const row of responseRows) {
        const raw = row[columns.responseMatch] ?? "";
        const key = normalize(raw);
        if (key && !responseKeys.has(key)) responseKeys.set(key, raw);
    }

    const seen = new Set<string>();
    const duplicateKeys = new Set<string>();
    const members: Member[] = [];
    const exempt: Member[] = [];
    for (const row of memberRows) {
        const matchValue = row[columns.memberMatch] ?? "";
        const key = normalize(matchValue);
        if (!key) continue;
        if (seen.has(key)) { duplicateKeys.add(key); continue; }
        seen.add(key);
        const member: Member = {
            name: row[columns.memberName] || matchValue,
            matchValue,
            key,
            discord: columns.memberDiscord ? (row[columns.memberDiscord] ?? "") : ""
        };
        (exemptKeys.has(key) ? exempt : members).push(member);
    }

    const submitted = members.filter(member => responseKeys.has(member.key));
    const missing = members.filter(member => !responseKeys.has(member.key));
    const unmatched = [...responseKeys].filter(([key]) => !seen.has(key)).map(([, raw]) => raw);

    return { members, submitted, missing, exempt, unmatched, duplicateKeys: [...duplicateKeys] };
}
