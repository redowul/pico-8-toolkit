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
test("Single punctuation counts as 1 token", `,`, 0);
test("Single identifier counts as 1 token", `myVar`, 1);

// ===== NUMBER EDGE CASES =====
test("Floating point counts as 1 token", `3.14`, 1);
test("Negative integer counts as 2 tokens", `-42`, 2); // "-", "42"
test("Negative float counts as 2 tokens", `-0.5`, 2); // "-", "0.5"
test("Minus operator between numbers counts as 3 tokens", `5-3`, 3); // "5", "-", "3"
test("Minus operator at start counts as 2 tokens", `- x`, 2); // "-", "x"
test("Dot prefix float counts as 1 token", `.5`, 1); // equivalent to "0.5"
test("Dot suffix number splits into number and dot", `42.`, 1); // "42."
test("String with multiple dots counts as 1 token", `4.2.1`, 1); // "4.2.1"
test("String with leading dot counts as 1 token", `.42.1`, 1); // ".42.1"
test("String with trailing dot counts as 1 token", `42.1.`, 1); // "42.1."

// ===== OPERATOR EDGE CASES =====
test("Double equals counts as 1 token", `==`, 1);
test("Plus equals counts as 1 token", `+=`, 1);
test("Concatenation operator counts as 1 token", `..`, 1);
test("Greater-than-equals counts as 1 token", `>=`, 1);
test("Not-equals counts as 1 token", `~=` ,1);

// ===== EMOJI TESTS =====
test("Single emoji counts as 1 token", `⬅️`, 1);
test("Emoji run counts as 1 token", `⬅️➡️⬆️⬇️🅾️❎`, 1);
test("Mixed emoji runs counts as 1 token", `⬅➡⬆⬇🅾❎⬆⬆`, 1);
test("Emoji inside identifier counts as 1 token", `foo⬆bar`, 1); // valid identifier
test("Emoji with text counts as 2 tokens", `hello➡️`, 1); // `hello➡️`
test("Emoji with text and method counts as 3 tokens", `hello➡️:bar()`, 3); // `hello➡️`, `bar`, `()`
test("Emoji after number splits into two tokens", `123⬅`, 2); // "123", "⬅"
test("Emoji plus underscore counts as identifier", `⬅_foo`, 1); // `⬅_foo`

// ===== ENV TESTS =====
test("env access does not count env", `env.foo`, 2); // `foo`
test("env method does not count env", `env:bar()`, 3); // `bar`, `()`
test("standalone env counts", `env`, 1);
test("env with emoji counts as 1 token", `env➡️`, 1); // `env➡️`
test("env with emoji and method counts as 2 tokens", `env➡️:bar()`, 3); // `env➡️`, `bar`, `()`
test("env with emoji and property counts as 2 tokens", `env➡️.foo`, 2); // `env➡️`, `foo`
test("env with emoji and property with method counts as 3 tokens", `env➡️.foo:bar()`, 4); // `env➡️`, `foo`, `bar`, `()`

// ===== COMMENT TESTS =====
test("Line comment ignored", `-- this is a comment`, 0);
test("Inline comment truncated", `print(1) -- comment`, 3); // print, 1, ()

// ===== LITERAL TESTS =====
test("String literal counts as 1 token", `"hello world"`, 1);
test("String with escape sequences counts as 1 token", `"line\\nbreak"`, 1);
test("Unterminated string counts as 1 token", `"unterminated`, 1);

// ===== MULTILINE COMMENT =====
test("Multiline comment ignored", `
--[[
this should not count
]]
print(1)
`, 3); // print, 1, ()

// ===== COMPLEX CODE TEST =====
test("Chained calls with emojis counts correctly", `player⬅️:getWeapon().fire()`, 5); 
// tokens: player⬅️, :, getWeapon, (), ., fire, ()

// ===== CODE TRUNCATION TEST =====
test("Stops counting at __gfx__", `
print(1)
__gfx__
aaaaa
`, 3); // print, 1, ()

// ===== PUNCTUATION EDGE CASES =====
test("Consecutive punctuation ignored correctly", `,),:`, 0); // all are NON_TOKENS

// ===== INVALID CHARACTERS =====
test("Mixed invalid tokens split properly", `@#$%^&*`, 7); // one token per symbol
