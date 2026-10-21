import { test } from "node:test";
import assert from "node:assert/strict";
import { matchSubmissions, normalize } from "../src/services/matching.js";

const columns = { memberName: "Name", memberMatch: "Email", memberDiscord: "Discord", responseMatch: "Email Address" };
const members = [
    { Name: "Alice", Email: "Alice@Example.com", Discord: "alice" },
    { Name: "Bob", Email: "bob@example.com", Discord: "123456789012345678" },
    { Name: "Cara", Email: "cara@example.com", Discord: "" },
    { Name: "Bob again", Email: " BOB@example.com ", Discord: "" },
    { Name: "", Email: "", Discord: "" }
];

test("normalize ignores case and spaces", () => {
    assert.equal(normalize("  A123 4 "), "a1234");
});

test("matches members to responses case-insensitively", () => {
    const responses = [{ "Email Address": "alice@example.com " }, { "Email Address": "stranger@example.com" }];
    const result = matchSubmissions(members, responses, columns, new Set());
    assert.deepEqual(result.submitted.map(m => m.name), ["Alice"]);
    assert.deepEqual(result.missing.map(m => m.name), ["Bob", "Cara"]);
    assert.deepEqual(result.unmatched, ["stranger@example.com"]);
    assert.deepEqual(result.duplicateKeys, ["bob@example.com"]);
});

test("exempt members are left out of counts", () => {
    const result = matchSubmissions(members, [], columns, new Set(["cara@example.com"]));
    assert.deepEqual(result.members.map(m => m.name), ["Alice", "Bob"]);
    assert.deepEqual(result.exempt.map(m => m.name), ["Cara"]);
});

test("duplicate responses count once", () => {
    const responses = [{ "Email Address": "bob@example.com" }, { "Email Address": "BOB@example.com" }];
    const result = matchSubmissions(members, responses, columns, new Set());
    assert.equal(result.submitted.length, 1);
    assert.equal(result.unmatched.length, 0);
});
