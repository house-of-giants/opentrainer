export type CsvDelimiter = "," | ";";

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
};

/**
 * Parses CSV text per RFC 4180: quoted fields may hold separators, doubled
 * quotes, and line breaks. Accepts CRLF, LF, or CR line endings, strips a
 * UTF-8 byte order mark, and skips blank lines. The separator is a comma or a
 * semicolon, picked from the header row when not given.
 */
export function parseCsv(text: string, delimiter?: CsvDelimiter): ParsedCsv {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const separator = delimiter ?? detectDelimiter(source);
  const records: string[][] = [];

  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;
  let i = 0;

  const endField = () => {
    record.push(field);
    field = "";
    fieldWasQuoted = false;
  };
  const endRecord = () => {
    endField();
    const isBlank = record.length === 1 && record[0] === "";
    if (!isBlank) records.push(record);
    record = [];
  };

  while (i < source.length) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"' && field === "" && !fieldWasQuoted) {
      inQuotes = true;
      fieldWasQuoted = true;
      i += 1;
      continue;
    }
    if (char === separator) {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      endRecord();
      i += char === "\r" && source[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (inQuotes) {
    throw new Error("The file has an unclosed quote, so it can't be read as CSV.");
  }
  if (field !== "" || fieldWasQuoted || record.length > 0) {
    endRecord();
  }

  const [headers = [], ...rows] = records;
  return {
    headers: headers.map((header) => header.trim()),
    rows,
    delimiter: separator,
  };
}

/** Counts unquoted commas and semicolons in the first record. */
function detectDelimiter(text: string): CsvDelimiter {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (char === "\n" || char === "\r") {
      if (commas + semicolons > 0) break;
      continue;
    }
    if (char === ",") commas += 1;
    if (char === ";") semicolons += 1;
  }

  return semicolons > commas ? ";" : ",";
}
