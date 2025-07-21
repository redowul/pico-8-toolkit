// === CONSTANTS ===
export const NON_TOKENS = new Set(['end', ',', ')', '}', ']', ':', '.']);

export const LITERALS = new Set(['nil', 'false', 'true']);
export const OPERATORS = new Set([
    '+', '-', '*', '/', '%', '^', '=', '==', '+=', '-=',
    '>=', '<=', '~=', '<', '>', '..', 'and', 'or', 'not'
]);
export const KEYWORDS = new Set([
    'if', 'then', 'else', 'elseif', 'while', 'do', 'for', 'in',
    'repeat', 'until', 'function', 'return', 'break'
]);
export const SYMBOLS = new Set(['(', '[', '{']);
export const EMOJIS = new Set([
    '❎', '🅾', '⬆', '⬇', '⬅', '➡', '❞', '⬅️', '➡️', '⬆️', '⬇️'
]);
export const SPECIAL_CHARS = new Set(['@', '#', '$', '%', '^', '&', '*']);

// === CHARACTER HELPERS ===
function isLetter(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
}

function isUnderscore(c: string): boolean {
    return c === '_';
}

function isEmoji(c: string): boolean {
    return EMOJIS.has(c);
}

function isIdentifierChar(c: string): boolean {
    return isLetter(c) || isDigit(c) || isUnderscore(c) || isEmoji(c);
}

// === TOKEN HELPERS ===
function isNumber(str: string): boolean {
    if (str.length === 0) {return false;}
    for (const c of str) {
        if (!isDigit(c) && c !== '.') {return false;}
    }
    return true;
}

function isStringLiteral(str: string): boolean {
    if (str.length === 0) {return false;}

    const first = str[0];
    const last = str[str.length - 1];

    // Starts and ends with same quote → valid string
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return true;
    }

    // Unterminated string → starts with quote but no matching end
    if (first === '"' || first === "'") {
        return true;
    }

    return false;
}


function isIdentifier(str: string): boolean {
    if (str.length === 0) {return false;}
    if (!isLetter(str[0]) && !isUnderscore(str[0]) && !isEmoji(str[0])) {
        return false;
    }
    for (let i = 1; i < str.length; i++) {
        if (!isIdentifierChar(str[i])) {return false;}
    }
    return true;
}

function isEmojiRun(str: string): boolean {
    return [...str].every(c => isEmoji(c));
}

function splitGraphemes(str: string): string[] {
    const graphemes: string[] = [];
    let i = 0;

    while (i < str.length) {
        let cluster = str[i];
        i++;

        // Merge ZWJ sequences
        while (i < str.length && str[i] === '\u200D') {
            cluster += str[i];    // Add ZWJ
            i++;
            if (i < str.length) {
                cluster += str[i]; // Add next emoji
                i++;
            }
        }

        graphemes.push(cluster);
    }

    return graphemes;
}

// === TOKENIZER ===
export function tokenize(text: string): string[] {
    const tokens: string[] = [];
    const chars = Array.from(text.trim());
    let i = 0;

    while (i < chars.length) {
        const char = chars[i];

        // Skip variation selectors and whitespace
        if (char === '\uFE0F' || /\s/.test(char)) {
            i++;
            continue;
        }

        // === Dot runs (special logic)
        if (char === '.') {
            let dots = '.';
            i++;
            while (i < chars.length && chars[i] === '.') {
                dots += chars[i++];
            }

            if (dots.length === 1) {
                // Single dots are non-tokens
                continue;
            }

            // Group dots into tokens
            let remaining = dots.length;
            let offset = 0;
            while (remaining > 0) {
                let chunkSize;
                if (offset === 0) {
                    // First group is up to 4 dots
                    chunkSize = Math.min(4, remaining);
                } else {
                    // Next groups are of size 3
                    chunkSize = Math.min(3, remaining);
                }
                const chunk = dots.substr(offset, chunkSize);
                tokens.push(chunk);
                offset += chunkSize;
                remaining -= chunkSize;
            }
            continue;
        }

        // === Identifiers (letters, digits, underscores, emojis merged)
        if (isLetter(char) || isUnderscore(char) || isEmoji(char)) {
            let ident = char;
            i++;
            while (i < chars.length && isIdentifierChar(chars[i])) {
                ident += chars[i++];
            }
            tokens.push(ident);
            continue;
        }

        // === Numbers (digits only)
        if (isDigit(char)) {
            let num = char;
            i++;
            while (i < chars.length && (isDigit(chars[i]) || chars[i] === '.')) {
                num += chars[i++];
            }
            tokens.push(num);
            continue;
        }

        // === String literals (supports escaped quotes and unterminated strings)
        if (char === '"' || char === "'") {
            const quote = char;
            let str = quote;
            i++;

            while (i < chars.length) {
                const current = chars[i];

                // Handle escaped character: \" stays inside string
                if (current === '\\' && i + 1 < chars.length) {
                    str += current + chars[i + 1]; // Add \ and next char
                    i += 2;
                    continue;
                }

                str += current;
                i++;

                // End string on unescaped quote
                if (current === quote) {
                    break; // Close the string properly
                }
            }
            tokens.push(str);
            continue;
        }

        // === Operators / Symbols
        if (OPERATORS.has(char) || SYMBOLS.has(char)) {
            tokens.push(char);
            i++;
            continue;
        }

        // === Fallback: single char token
        tokens.push(char);
        i++;
    }

    // === FINAL EMOJI RUN COLLAPSE ===
    if (tokens.length > 1 && tokens.every(t => isEmoji(t))) {
        tokens.splice(0, tokens.length, tokens.join('')); // collapse into single token
    }

    console.log('Tokens:', tokens);
    return tokens;
}


// === POST-PROCESSING ===
function mergeTokens(tokens: string[]): string[] {
    const merged: string[] = [];
    const opMap: Record<string, string> = {
        '==': '==',
        '+=': '+=',
        '-=': '-=',
        '>=': '>=',
        '<=': '<=',
        '..': '..'
    };

    let i = 0;
    while (i < tokens.length) {
        const a = tokens[i];
        const b = tokens[i + 1];

        if (a && b && opMap[a + b]) {
            merged.push(a + b);
            i += 2;
            continue;
        }

        merged.push(a);
        i++;
    }

    return merged;
}

function isToken(token: string): boolean {
    return (
        LITERALS.has(token) ||
        OPERATORS.has(token) ||
        SYMBOLS.has(token) ||
        KEYWORDS.has(token) ||
        SPECIAL_CHARS.has(token) ||
        isNumber(token) ||
        isStringLiteral(token) ||
        isEmojiRun(token) ||
        (isIdentifier(token) && !NON_TOKENS.has(token) && token !== 'local')
    );
}

// === COUNTING FUNCTIONS ===
export function countTokensInLine(line: string): number {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('//')) {
        return 0;
    }

    const commentIndex = Math.min(...['--', '//'].map(sep => {
        const idx = line.indexOf(sep);
        return idx === -1 ? Infinity : idx;
    }));
    const code = line.slice(0, commentIndex === Infinity ? undefined : commentIndex);

    const tokens = tokenize(code);
    const filtered = tokens.filter(t => !NON_TOKENS.has(t));
    const merged = mergeTokens(filtered);

    return merged.filter((token) => isToken(token)).length;
}

export function countTokensInText(text: string): number {
    text = stripPico8Header(text);
    const truncateAt = ['__gfx__', '__label__', '__map__', '__sfx__', '__music__'];

    for (const header of truncateAt) {
        const index = text.indexOf(header);
        if (index !== -1) {
            text = text.slice(0, index);
            break;
        }
    }

    const cleaned = text
        .replace(/--\[\[[\s\S]*?\]\]/g, '') // multiline comments
        .replace(/--.*$/gm, '');            // single-line comments

    return cleaned.split('\n').reduce((sum, line) => sum + countTokensInLine(line), 0);
}

function stripPico8Header(text: string): string {
    const lines = text.split(/\r?\n/);
    let result = '';
    for (const line of lines) {
        if (
            line.startsWith('pico-8 cartridge') ||
            line.startsWith('version') ||
            line.startsWith('__lua__')
        ) {
            continue; // skip header
        }
        result += line + '\n';
    }
    return result.trim();
}
