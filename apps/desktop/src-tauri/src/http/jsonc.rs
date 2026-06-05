//! Strip JSONC-style comments from a JSON body before sending.
//!
//! Users write request bodies with `//` line comments and `/* */` block
//! comments (JSONC). Servers expect strict JSON, so comments must be removed
//! before the body is sent. Stripping is string-aware: comment markers that
//! appear inside a JSON string value are left untouched.

/// Remove `//` line comments and `/* */` block comments from a JSON string.
///
/// Comment markers inside string literals are preserved. Characters that are
/// not comments are copied verbatim, so whitespace and formatting outside of
/// removed comments are unchanged.
pub fn strip_json_comments(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            // Inside a string literal: copy through to the closing quote,
            // honouring backslash escapes so `\"` does not end the string.
            '"' => {
                out.push(c);
                while let Some(sc) = chars.next() {
                    out.push(sc);
                    if sc == '\\' {
                        if let Some(escaped) = chars.next() {
                            out.push(escaped);
                        }
                    } else if sc == '"' {
                        break;
                    }
                }
            }
            // Comment markers, only when not inside a string.
            '/' => match chars.peek() {
                Some('/') => {
                    chars.next();
                    // Drop everything up to (but not including) the newline,
                    // so line structure is preserved.
                    while let Some(&lc) = chars.peek() {
                        if lc == '\n' {
                            break;
                        }
                        chars.next();
                    }
                }
                Some('*') => {
                    chars.next();
                    let mut prev = '\0';
                    for bc in chars.by_ref() {
                        if prev == '*' && bc == '/' {
                            break;
                        }
                        prev = bc;
                    }
                }
                // A lone `/` is not a comment; keep it.
                _ => out.push(c),
            },
            _ => out.push(c),
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parses(s: &str) -> bool {
        serde_json::from_str::<serde_json::Value>(s).is_ok()
    }

    #[test]
    fn strips_leading_line_comment() {
        // The bug from issue #85: a comment before the JSON broke the request.
        let input = "// { \"test\": \"test2\"}\n{ \"test\":\"test\"}";
        let out = strip_json_comments(input);
        assert!(
            parses(&out),
            "stripped output should be valid JSON: {out:?}"
        );
    }

    #[test]
    fn strips_trailing_line_comment() {
        let input = "{ \"test\":\"test\"}\n// { \"test\": \"test2\"}";
        let out = strip_json_comments(input);
        assert!(
            parses(&out),
            "stripped output should be valid JSON: {out:?}"
        );
    }

    #[test]
    fn strips_block_comment() {
        let input = "{ /* inline */ \"test\": \"test\" }";
        let out = strip_json_comments(input);
        assert!(
            parses(&out),
            "stripped output should be valid JSON: {out:?}"
        );
    }

    #[test]
    fn preserves_double_slash_inside_string() {
        let input = "{ \"url\": \"https://example.com\" }";
        let out = strip_json_comments(input);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["url"], "https://example.com");
    }

    #[test]
    fn preserves_block_marker_inside_string() {
        let input = "{ \"glob\": \"/*.json\" }";
        let out = strip_json_comments(input);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["glob"], "/*.json");
    }

    #[test]
    fn preserves_escaped_quote_inside_string() {
        let input = "{ \"q\": \"a \\\" // not a comment\" }";
        let out = strip_json_comments(input);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["q"], "a \" // not a comment");
    }

    #[test]
    fn preserves_escaped_backslash_before_closing_quote() {
        // The value is `val\` — an escaped backslash right before the closing
        // quote. The string-end detection must not be fooled into running past
        // it and eating the rest of the JSON.
        let input = "{\"k\": \"val\\\\\"}";
        let out = strip_json_comments(input);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["k"], "val\\");
    }

    #[test]
    fn leaves_plain_json_untouched() {
        let input = "{\"a\":1,\"b\":[2,3]}";
        assert_eq!(strip_json_comments(input), input);
    }
}
