export const NON_TOKENS = new Set(['end', ',', ')', '}', ']', ':']);

export const LITERALS = new Set(['nil', 'false', 'true']);
export const OPERATORS = new Set([
    '+', '-', '*', '/', '%', '^', '#', '=', '==', '+=', '-=',
    '>=', '<=', '~=', '<', '>', '..', 'and', 'or', 'not'
]);
export const KEYWORDS = new Set([
    'if', 'then', 'else', 'elseif', 'while', 'do', 'for', 'in',
    'repeat', 'until', 'function', 'return', 'break'
]);
export const SYMBOLS = new Set(['(', '[', '{']);
export const SPECIALS = new Set(['❎', '🅾', '⬆', '⬇', '⬅', '➡', '❞']); // normalized emojis

function isInteger(str: string): boolean {
    if (typeof str !== 'string') {
        return false;
    } 
    return str.length > 0 && [...str].every(c => c >= '0' && c <= '9');
}

function isFloat(str: string): boolean {
    if (typeof str !== 'string') {
        return false;
    } 
    const parts = str.split('.');
    return parts.length === 2 && isInteger(parts[0]) && isInteger(parts[1]);
}

function isNumber(str: string): boolean {
    return isInteger(str) || isFloat(str);
}

function isStringLiteral(str: string): boolean {
    return (str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"));
}

function isIdentifier(str: string): boolean {
    // Identifiers can include emojis in PICO-8
    return /^[a-zA-Z_❎🅾⬆⬇⬅➡❞][a-zA-Z0-9_❎🅾⬆⬇⬅➡❞]*$/.test(str);
}

function isEmoji(char: string): boolean {
    return SPECIALS.has(char);
}

function tokenize(text: string): string[] {
    const tokens: string[] = [];
    const chars = Array.from(text.trim());
    let i = 0;
    let lastTokenType: 'emoji' | 'identifier' | 'number' | 'other' | null = null;

    while (i < chars.length) {
        const char = chars[i];

        // Skip variation selectors and whitespace
        if (char === '\uFE0F' || /\s/.test(char)) {
            i++;
            continue;
        }

        // === Emoji run ===
        if (isEmoji(char)) {
            if (lastTokenType === 'emoji') {
                tokens[tokens.length - 1] += char; // merge with last emoji token
            } else {
                tokens.push(char);
            }
            lastTokenType = 'emoji';
            i++;
            continue;
        }

        // === Identifiers (letters/numbers/emoji mix) ===
        if (/[a-zA-Z_]/.test(char)) {
            let ident = char;
            i++;
            while (
                i < chars.length &&
                (/[a-zA-Z0-9_]/.test(chars[i]) || isEmoji(chars[i]))
            ) {
                ident += chars[i++];
            }
            tokens.push(ident);
            lastTokenType = 'identifier';
            continue;
        }

        // === Numbers (integers or floats) ===
        if (isInteger(char) || (char === '.' && isInteger(chars[i + 1]))) {
            let num = char;
            i++;
            while (
                i < chars.length &&
                (isInteger(chars[i]) || chars[i] === '.')
            ) {
                num += chars[i++];
            }
            tokens.push(num);
            lastTokenType = 'number';
            continue;
        }

        // === Operators / negative sign ===
        if (OPERATORS.has(char) || SYMBOLS.has(char)) {
            tokens.push(char);
            lastTokenType = 'other';
            i++;
            continue;
        }

        // === String literals ===
        if (char === '"' || char === "'") {
            let quote = char;
            let str = quote;
            i++;
            while (i < chars.length && chars[i] !== quote) {
                str += chars[i++];
            }
            if (i < chars.length) {
                str += quote;
                i++;
            }
            tokens.push(str);
            lastTokenType = 'other';
            continue;
        }

        // === Fallback: single char token ===
        tokens.push(char);
        lastTokenType = 'other';
        i++;
    }

    return tokens;
}



function mergeTokens(tokens: string[]): string[] {
    const merged: string[] = [];
    const opMap: Record<string, string> = {
        '==': '==',
        '+=': '+=',
        '-=': '-=',
        '>=': '>=',
        '<=': '<=',
        '..': '..', // Add concatenation operator
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


function isToken(token: string, p0: string): boolean {
    const allEmojis = [...token].every(char => SPECIALS.has(char));

    return (
        LITERALS.has(token) ||
        OPERATORS.has(token) ||
        SYMBOLS.has(token) ||
        KEYWORDS.has(token) ||
        allEmojis ||
        isNumber(token) ||
        isStringLiteral(token) ||
        (isIdentifier(token) && !NON_TOKENS.has(token) && token !== 'local')
    );
}

export function countTokensInLine(line: string): number {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        return 0;
    }

    const commentIndex = Math.min(...['--', '//', '#'].map(sep => {
        const idx = line.indexOf(sep);
        return idx === -1 ? Infinity : idx;
    }));
    const code = line.slice(0, commentIndex === Infinity ? undefined : commentIndex);

    const tokens = tokenize(code);
    const filtered = tokens.filter(t => !NON_TOKENS.has(t));
    const merged = mergeTokens(filtered);

    return merged.filter((token, i, arr) => isToken(token, arr[i + 1])).length;
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
        if (line.startsWith('pico-8 cartridge') || line.startsWith('version') || line.startsWith('__lua__')) {
            continue; // skip header
        }
        result += line + '\n';
    }
    return result.trim();
}
