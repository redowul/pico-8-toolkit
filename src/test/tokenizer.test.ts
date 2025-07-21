import assert from 'assert';
import { countTokensInText } from '../tokenizer';

function test(description: string, input: string, expected: number) {
    const result = countTokensInText(input);
    try {
        assert.strictEqual(result, expected);
        console.log(`✅ ${description}`);
    } catch (e) {
        console.error(`❌ ${description}`);
        console.error(`   Expected ${expected}, got ${result}`);
    }
}

// ===== HEADER TEST =====
test("Pico-8 header counts as 0 tokens", `
pico-8 cartridge // http://www.pico-8.com
version 36
__lua__
`, 0);

// ===== BASIC TESTS =====
test("Empty string counts as 0 tokens", ``, 0);
test("Whitespace counts as 0 tokens", `   `, 0);
test("Single keyword counts as 1 token", `print`, 1);
test("Single number counts as 1 token", `123`, 1);
test("Single string counts as 1 token", `"hello"`, 1);
test("Single operator counts as 1 token", `+`, 1);
test("Single punctuation counts as 0 tokens", `,`, 0);
test("Single identifier counts as 1 token", `myVar`, 1);

// ===== NUMBER EDGE CASES =====
test("Floating point counts as 1 token", `3.14`, 1);
test("Negative integer counts as 2 tokens", `-42`, 2);
test("Negative float counts as 2 tokens", `-0.5`, 2);
test("Minus operator between numbers counts as 3 tokens", `5-3`, 3);
test("Dot prefix float counts as 1 token", `.5`, 1);
test("Dot suffix float counts as 1 token", `42.`, 1);
test("Float with multiple dots counts as 1 token", `4.2.1`, 1);
test("Float with leading dot counts as 1 token", `.42.1`, 1);
test("Float with trailing dot counts as 1 token", `42.1.`, 1);
test("Number with multiple leading dots counts as 2 tokens", `..123`, 2);
test("Number with interleaved dots counts as 1 token", `1..2.3`, 1);

// ===== OPERATOR EDGE CASES =====
test("Double equals counts as 1 token", `==`, 1);
test("Plus equals counts as 1 token", `+=`, 1);
test("Concatenation operator counts as 1 token", `..`, 1);
test("Greater-than-equals counts as 1 token", `>=`, 1);
test("Not-equals counts as 1 token", `~=`, 1);
test("Chained operators split correctly", `++==`, 3);
test("Operators and numbers mixed", `5+=3`, 3);
test("Invalid multi-char operator splits", `=+`, 2);

// ===== EMOJI TESTS =====
test("Single emoji counts as 1 token", `⬅️`, 1);
test("Emoji run counts as 1 token", `⬅️➡️⬆️⬇️🅾️❎`, 1);
test("Mixed emoji run counts as 1 token", `⬅➡⬆⬇🅾❎⬆⬆`, 1);
test("Emoji inside identifier counts as 1 token", `foo⬆bar`, 1);
test("Emoji with text counts as 1 token", `hello➡️`, 1);
test("Emoji with text and method counts as 3 tokens", `hello➡️:bar()`, 3);
test("Emoji after number splits into two tokens", `123⬅`, 2);
test("Emoji plus underscore counts as identifier", `⬅_foo`, 1);
test("Emoji with digits counts as 1 token", `⬆123`, 1);
test("Emoji and digit separated counts as 2 tokens", `⬆ 123`, 2);
test("Emoji-only string counts as 1 token", `"⬆⬇"`, 1);
test("Emoji surrounded by underscores counts as identifier", `_⬅_`, 1);

// ===== ENV TESTS =====
test("env access does not count env", `env.foo`, 2);
test("env method does not count env", `env:bar()`, 3);
test("standalone env counts", `env`, 1);
test("env with emoji counts as 1 token", `env➡️`, 1);
test("env with emoji and method counts as 3 tokens", `env➡️:bar()`, 3);
test("env with emoji and property counts as 2 tokens", `env➡️.foo`, 2);
test("env with emoji and property with method counts as 4 tokens", `env➡️.foo:bar()`, 4);
test("env double property access counts properly", `env.foo.bar`, 3);
test("env with multiple colons counts properly", `env:foo:bar()`, 4);

// ===== STRING TESTS =====
test("Empty string literal counts as 1 token", `""`, 1);
test("String with internal quotes counts as 1 token", String.raw`"he said \"hi\""`, 1);
test("Single quote string counts as 1 token", String.raw`'abc'`, 1);
test("Unterminated string with escape sequences counts as 1 token", String.raw`"abc\\`, 1);

// ===== COMMENT TESTS =====
test("Line comment ignored", `-- this is a comment`, 0);
test("Inline comment truncated", `print(1) -- comment`, 3);
test("Comment immediately after code truncated", `print(1)--comment`, 3);
test("Multiline comment ignored", `
--[[
this should not count
]]
print(1)
`, 3);

// ===== COMPLEX CODE TEST =====
test("Chained calls with emojis counts correctly", `player⬅️:getWeapon().fire()`, 5);

// ===== CODE TRUNCATION TEST =====
test("Stops counting at __gfx__", `
print(1)
__gfx__
aaaaa
`, 3);

// ===== PUNCTUATION EDGE CASES =====
test("Consecutive punctuation ignored correctly", `,),:`, 0);

// ===== INVALID CHARACTERS =====
test("Mixed invalid tokens split properly", `@#$%^&*`, 7);
test("Emoji with non-token character splits", `⬅@`, 2);

// ===== OTHER =====
test("Non-token separator ignored", `;`, 0);
test("Multiple separators ignored", `;,:)`, 0);
test("Multiple spaces ignored", `   `, 0);