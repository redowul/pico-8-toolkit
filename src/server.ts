import { createConnection, TextDocuments, TextDocumentSyncKind, InitializeParams, DidChangeWatchedFilesParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'path';
import * as fs from 'fs';

const connection = createConnection();
const documents = new TextDocuments(TextDocument);
let selectedFilePaths: Set<string> | null = null;

const TOKEN_MAX = 8192;

const NON_TOKENS = new Set(['end', ',', ')', '}', ']', ':']);

const TOKEN_PATTERN = /"[^"]*"|\bnil\b|\bfalse\b|\btrue\b|\b\w+\b|\d+\.\d+|\d+|[\[\]{}()<>.,;:+=\-*/%~^#()]|[❎⬆⬇⬅➡❞]/gu;

const KEYWORDS = new Set([
  'if', 'then', 'else', 'elseif', 'while', 'do', 'for', 'in',
  'repeat', 'until', 'function', 'return', 'break'
]);

const OPERATORS = new Set([
  '+', '-', '*', '/', '%', '^', '#', '=', '==', '+=', '-=',
  '>=', '<=', '~=', '<', '>', '..', 'and', 'or', 'not'
]);

const SYMBOLS = new Set(['(', '[', '{']);

const LITERALS = new Set(['nil', 'false', 'true']);

const SPECIALS = new Set(['❎', '⬆', '⬇', '⬅', '➡', '❞']);

function mergeTokens(tokens: string[]): string[] {
  const merged: string[] = [];
  const opMap: Record<string, string> = {
    '==': '==',
    '+=': '+=',
    '-=': '-=',
    '>=': '>=',
    '<=': '<='
  };

  const negativePrefix = new Set([
    'and', 'or', 'if', 'elseif', 'while', 'until', 'return', 'not', 'local',
    '+', '-', '*', '/', '%', '^', '^^', '=', '==', '!=', '+=', '-=',
    '>=', '<=', '~=', '<', '>', '.', '(', ')', '[', ']', '{', '}',
    ';', ':', ':=', ':==', '?', '&', '|'
  ]);

  let i = 0;
  while (i < tokens.length) {
    const a = tokens[i];
    const b = tokens[i + 1];
    const c = tokens[i + 2];

    if (a && b === '.' && c && /^\d+$/.test(a) && /^\d+$/.test(c)) {
      merged.push(`${a}.${c}`);
      i += 3;
    } else if (a && b && opMap[a + b]) {
      merged.push(a + b);
      i += 2;
    } else if (a === '-' && b && /^\d+$/.test(b) && i > 0 && negativePrefix.has(tokens[i - 1])) {
      merged.push(`-${b}`);
      i += 2;
    } else {
      merged.push(a);
      i++;
    }
  }

  return merged;
}

function isToken(token: string): boolean {
  if (LITERALS.has(token) || OPERATORS.has(token) || SYMBOLS.has(token) || KEYWORDS.has(token) || SPECIALS.has(token)) return true;
  if (/^-?\d+(\.\d+)?$/.test(token)) return true;
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) return true;
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token) && !NON_TOKENS.has(token) && token !== 'local') return true;
  return false;
}

function countTokensInLine(line: string): number {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('//') || trimmed.startsWith('#')) return 0;

  const commentIndex = Math.min(...['--', '//', '#'].map(sep => {
    const idx = line.indexOf(sep);
    return idx === -1 ? Infinity : idx;
  }));
  const code = line.slice(0, commentIndex === Infinity ? undefined : commentIndex);

  const tokens = [...code.matchAll(TOKEN_PATTERN)].map(m => m[0]);
  const filtered = tokens.filter(t => !NON_TOKENS.has(t));
  const merged = mergeTokens(filtered);
  return merged.filter(isToken).length;
}

function countTokensInText(text: string): number {
  // Remove the standard .p8 header block
  const header = `pico-8 cartridge // http://www.pico-8.com
version 36
__lua__
`;
  if (text.startsWith(header)) {
    text = text.slice(header.length);
  }

  // Stop at first non-code section (e.g., __gfx__, __map__, etc.)
  const truncateAt = ['__gfx__', '__label__', '__map__', '__sfx__', '__music__'];
  let minIndex = text.length;
  for (const header of truncateAt) {
    const i = text.indexOf(header);
    if (i !== -1 && i < minIndex) minIndex = i;
  }

  const truncated = text.slice(0, minIndex);

  // Remove multi-line comments
  const cleaned = truncated.replace(/--\[\[[\s\S]*?\]\]/g, '');

  return cleaned.split('\n').reduce((sum, line) => sum + countTokensInLine(line), 0);
}

function countTokensInFile(filePath: string): { fileName: string, count: number } {
  const text = fs.readFileSync(filePath, 'utf8');
  const firstLine = text.split('\n')[0].trim();
  if (firstLine === '__gfx__') return { fileName: path.basename(filePath), count: 0 };
  const count = countTokensInText(text);
  return { fileName: path.basename(filePath), count };
}

connection.onInitialize((_params: InitializeParams) => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    workspace: {
      workspaceFolders: { supported: true, changeNotifications: true },
      didChangeWatchedFiles: { dynamicRegistration: true }
    }
  }
}));

documents.onDidOpen(() => sendTotalTokenStatus());
documents.onDidSave(() => sendTotalTokenStatus());
documents.onDidChangeContent(() => sendTotalTokenStatus());
connection.onDidChangeWatchedFiles((_params: DidChangeWatchedFilesParams) => sendTotalTokenStatus());

connection.onNotification('pico8/updateSelectedFiles', (paths: string[]) => {
  selectedFilePaths = new Set(paths.map(p => path.resolve(p)));
  sendTotalTokenStatus();
});

function sendTotalTokenStatus() {
    let diskCounts: { fileName: string; count: number }[] = [];

    if (selectedFilePaths && selectedFilePaths.size > 0) {
      diskCounts = [...selectedFilePaths].map(countTokensInFile);
    } else {
      const cwd = process.cwd();
      const allFiles = fs.readdirSync(cwd)
        .filter(f => f.endsWith('.p8'))
        .map(f => path.resolve(path.join(cwd, f)))
        .filter(p => fs.statSync(p).isFile());

      diskCounts = allFiles.map(countTokensInFile);
    }
    const fileCounts: Record<string, number> = {};
  
    // Start with disk counts
    for (const { fileName, count } of diskCounts) {
      fileCounts[fileName] = count;
    }
  
    for (const doc of documents.all()) {
      const fsPath = path.resolve(new URL(doc.uri).pathname);
      const fileName = path.basename(fsPath);
    
      // Only include if: either we're not using selection, or this file was selected
      const usingSelection = selectedFilePaths !== null;
      const shouldInclude = !usingSelection || (selectedFilePaths !== null && selectedFilePaths.has(fsPath));
      // If the file is already counted from disk, skip it
      if (shouldInclude && fileName.endsWith('.p8')) {
        const text = doc.getText();
        const firstLine = text.split('\n')[0].trim();
        const count = firstLine === '__gfx__' ? 0 : countTokensInText(text);
        fileCounts[fileName] = count;
      }
    }    
  
    // Compute total from final merged set
    const totalCount = Object.values(fileCounts).reduce((a, b) => a + b, 0);
    connection.sendNotification('pico8/tokenCount', {
      fileName: 'TOTAL',
      count: totalCount,
      max: TOKEN_MAX,
      remaining: TOKEN_MAX - totalCount,
      files: Object.entries(fileCounts).map(([file, count]) => ({ file, count }))
    });
}  

sendTotalTokenStatus();

documents.listen(connection);
connection.listen();
