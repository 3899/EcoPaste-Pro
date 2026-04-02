use regex::Regex;
use reqwest::Url;
use std::path::Path;
use std::sync::OnceLock;

pub fn detect_text_subtype(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    if is_path(trimmed) {
        return Some("path".to_string());
    }

    if is_url(trimmed) {
        return Some("url".to_string());
    }

    if is_email(trimmed) {
        return Some("email".to_string());
    }

    if is_color(trimmed) {
        return Some("color".to_string());
    }

    if is_command(trimmed) {
        return Some("command".to_string());
    }

    if is_markdown(trimmed) {
        return Some("markdown".to_string());
    }

    detect_code(trimmed).map(|lang| format!("code_{lang}"))
}

fn is_url(value: &str) -> bool {
    Url::parse(value).is_ok()
}

fn is_email(value: &str) -> bool {
    static EMAIL_RE: OnceLock<Regex> = OnceLock::new();
    EMAIL_RE
        .get_or_init(|| {
            Regex::new(r"^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$")
                .expect("valid email regex")
        })
        .is_match(value)
}

fn is_color(value: &str) -> bool {
    static HEX_RE: OnceLock<Regex> = OnceLock::new();
    static RGB_HSL_RE: OnceLock<Regex> = OnceLock::new();
    static CMYK_RE: OnceLock<Regex> = OnceLock::new();

    HEX_RE
        .get_or_init(|| {
            Regex::new(r"^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
                .expect("valid hex color regex")
        })
        .is_match(value)
        || RGB_HSL_RE
            .get_or_init(|| Regex::new(r"^(rgb|hsl)a?\(").expect("valid rgb/hsl regex"))
            .is_match(value)
        || CMYK_RE
            .get_or_init(|| {
                Regex::new(r"^cmyk\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$")
                    .expect("valid cmyk regex")
            })
            .is_match(value)
}

fn is_path(value: &str) -> bool {
    static ENV_PATH_RE: OnceLock<Regex> = OnceLock::new();
    static FS_PATH_RE: OnceLock<Regex> = OnceLock::new();
    static UNC_PATH_RE: OnceLock<Regex> = OnceLock::new();
    static SHELL_PATH_RE: OnceLock<Regex> = OnceLock::new();
    static SHELL_GUID_RE: OnceLock<Regex> = OnceLock::new();

    ENV_PATH_RE
        .get_or_init(|| {
            Regex::new(r"^%[A-Za-z_()][A-Za-z0-9_()]*%(\\.*)?$")
                .expect("valid env path regex")
        })
        .is_match(value)
        || FS_PATH_RE
            .get_or_init(|| Regex::new(r"^[A-Za-z]:[\\/]").expect("valid fs path regex"))
            .is_match(value)
        || UNC_PATH_RE
            .get_or_init(|| Regex::new(r"^\\\\[^\\]").expect("valid unc path regex"))
            .is_match(value)
        || SHELL_PATH_RE
            .get_or_init(|| Regex::new(r"^shell:[a-zA-Z\s]+$").expect("valid shell path regex"))
            .is_match(value)
        || SHELL_GUID_RE
            .get_or_init(|| {
                Regex::new(r"^shell:::\{[0-9A-Fa-f-]+\}$").expect("valid shell guid regex")
            })
            .is_match(value)
        || Path::new(value).exists()
}

fn is_command(value: &str) -> bool {
    matches!(
        value.to_ascii_lowercase().as_str(),
        "regedit"
            | "gpedit.msc"
            | "sysdm.cpl"
            | "taskmgr"
            | "msconfig"
            | "services.msc"
            | "compmgmt.msc"
            | "resmon"
            | "control"
            | "ncpa.cpl"
            | "appwiz.cpl"
            | "diskmgmt.msc"
            | "powercfg.cpl"
            | "firewall.cpl"
            | "timedate.cpl"
            | "cmd"
            | "powershell"
            | "mstsc"
            | "calc"
            | "notepad"
            | "write"
            | "wordpad"
            | "mspaint"
            | "osk"
            | "dxdiag"
    )
}

fn is_markdown(value: &str) -> bool {
    if value.len() < 5 {
        return false;
    }

    let brace_blocks = Regex::new(r"\{[\s\S]{1,50}?\}")
        .expect("valid brace regex")
        .find_iter(value)
        .count();
    let semicolons = Regex::new(r";\s*$")
        .expect("valid semicolon regex")
        .find_iter(value)
        .count();
    let js_keywords = Regex::new(r"\b(function|var|const|let|return|define|exports)\b")
        .expect("valid js keyword regex")
        .find_iter(value)
        .count();

    let total_code_hits = brace_blocks + semicolons + js_keywords;
    let code_penalty = if total_code_hits > 10 {
        total_code_hits as i32 * 5
    } else {
        0
    };

    let patterns = [
        (Regex::new(r"(?m)^#{1,6}\s+[^\n]+").unwrap(), 30),
        (Regex::new(r"(?m)^\s*[*+-]\s+[^\n]{1,200}$").unwrap(), 20),
        (Regex::new(r"(?m)^\s*\d+\.\s+[^\n]{1,200}$").unwrap(), 20),
        (Regex::new(r"(?ms)^```[a-zA-Z0-9]*\s*[\s\S]+?^```").unwrap(), 40),
        (
            Regex::new(r"(?:^|[^a-zA-Z0-9_$])\[[^\]\n]+\]\([^\s)(]+\)").unwrap(),
            25,
        ),
        (Regex::new(r"!\[[^\]\n]*\]\([^\s)(]+\)").unwrap(), 25),
        (
            Regex::new(r"(?:^|[^[:alnum:]_])\*\*[^\s].+?[^\s]\*\*(?:$|[^[:alnum:]_])").unwrap(),
            10,
        ),
        (
            Regex::new(r"(?:^|[^[:alnum:]_])__[^\s].+?[^\s]__(?:$|[^[:alnum:]_])").unwrap(),
            10,
        ),
        (Regex::new(r"(?m)^>\s+.+").unwrap(), 15),
        (
            Regex::new(r"(?m)^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$").unwrap(),
            40,
        ),
    ];

    let mut score = 0;
    for (regex, weight) in patterns {
        let count = regex.find_iter(value).count() as i32;
        if count > 0 {
            score += (count * weight).min(weight * 2);
        }
    }

    score - code_penalty >= 35
}

fn detect_code(content: &str) -> Option<&'static str> {
    let trimmed = content.trim();
    if trimmed.len() < 10 || is_natural_language(trimmed) {
        return None;
    }

    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        if serde_json::from_str::<serde_json::Value>(trimmed).is_ok() {
            return Some("json");
        }
    }

    if is_svg(trimmed) {
        return Some("svg");
    }

    if trimmed.starts_with('<')
        && Regex::new(r"^<\s*(!doctype|html|head|body|div|script|style|link|meta|span|p|h[1-6])[\s>]")
            .unwrap()
            .is_match(trimmed)
    {
        return Some("html");
    }

    if (trimmed.starts_with('.') || trimmed.starts_with('#') || trimmed.starts_with('@'))
        && Regex::new(r"^(\.[a-zA-Z].*\{|#[a-zA-Z].*\{|@media\s)")
            .unwrap()
            .is_match(trimmed)
    {
        return Some("css");
    }

    if is_valid_sql(trimmed) {
        return Some("sql");
    }

    quick_language_detection(trimmed)
}

fn contains_multiple(text: &str, keywords: &[&str], min_matches: usize) -> bool {
    let lower = text.to_ascii_lowercase();
    let matches = keywords
        .iter()
        .filter(|kw| lower.contains(&kw.to_ascii_lowercase()))
        .count();
    matches >= min_matches
}

fn is_log_format(text: &str) -> bool {
    Regex::new(r"\[\d{4}-\d{2}-\d{2}.*?\d{2}:\d{2}:\d{2}")
        .unwrap()
        .is_match(text)
        || Regex::new(r"\[(DEBUG|INFO|WARN|ERROR|FATAL|CRITICAL|TRACE|NOTICE)\]")
            .unwrap()
            .is_match(text)
}

fn is_natural_language(text: &str) -> bool {
    if is_log_format(text) {
        return true;
    }

    let common_words = [
        "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
        "this", "that", "which", "what", "when", "where", "who", "how", "is", "are", "was",
        "were", "have", "has", "had", "been", "being", "can", "could", "will", "would",
        "should", "may",
    ];

    let words = text.split_whitespace().filter(|w| w.len() > 2).collect::<Vec<_>>();
    if words.is_empty() {
        return false;
    }

    let common_count = words
        .iter()
        .filter(|w| common_words.contains(&w.to_ascii_lowercase().as_str()))
        .count();

    (common_count as f32 / words.len() as f32) > 0.3
}

fn is_svg(value: &str) -> bool {
    Regex::new(r"^(?:<\?xml[^>]*\?>\s*)?(?:<!doctype svg[^>]*>\s*)?(?:\s*)*<svg[^>]*>(?:[\s\S]*</svg>)?\s*$")
        .unwrap()
        .is_match(value)
        && (value.ends_with("</svg>") || value.ends_with("/>"))
}

fn quick_language_detection(text: &str) -> Option<&'static str> {
    let lower = text.to_ascii_lowercase();

    if contains_multiple(
        text,
        &[
            "function ",
            "const ",
            "let ",
            "var ",
            "console.log",
            "=>",
            "import ",
            "export ",
            "webpackjsonp",
            "__webpack_require__",
            "prototype.",
            "object.assign",
            "object.create",
            "object.keys",
        ],
        2,
    ) && !lower.contains("class main")
    {
        return Some("javascript");
    }

    if contains_multiple(
        text,
        &[
            "int main",
            "cout",
            "cin",
            "std::",
            "using namespace std",
            "#include",
            "nullptr",
            "template<",
        ],
        2,
    ) || contains_multiple(
        text,
        &["const_cast", "dynamic_cast", "reinterpret_cast", "static_cast"],
        2,
    ) || (contains_multiple(text, &["#include", "using namespace", "std::"], 2)
        && contains_multiple(text, &["int", "main"], 2))
    {
        if contains_multiple(text, &["function", "var", "const", "let"], 2) {
            return Some("javascript");
        }
        return Some("cpp");
    }

    if contains_multiple(text, &["#include", "printf", "scanf", "malloc", "free"], 3)
        && !lower.contains("cout")
    {
        return Some("c");
    }

    if contains_multiple(
        text,
        &["public class", "public static void main", "system.out.println"],
        2,
    ) && !lower.contains("console.writeline")
    {
        return Some("java");
    }

    if contains_multiple(text, &["def ", "import ", "print(", ":"], 2)
        && !lower.contains("function")
    {
        return Some("python");
    }

    if contains_multiple(
        text,
        &["interface ", "type ", "as ", ": string", ": number", ": boolean"],
        2,
    ) {
        return Some("typescript");
    }

    if contains_multiple(
        text,
        &["fn ", "let mut", "println!", "use std::", "-> ", "match ", "impl ", "pub fn"],
        2,
    ) {
        return Some("rust");
    }

    if contains_multiple(text, &["func main", "package main", "import \"", "fmt.", "go "], 2) {
        return Some("go");
    }

    if contains_multiple(
        text,
        &["using system", "public class", "console.writeline", "namespace "],
        2,
    ) {
        return Some("csharp");
    }

    None
}

fn is_valid_sql(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    let sql_keywords = [
        "select", "from", "where", "insert", "update", "delete", "create", "drop", "table",
        "index", "join", "inner", "left", "right", "group", "order", "by", "union",
        "distinct", "primary", "key", "foreign", "references", "not", "null", "default",
    ];

    let found = sql_keywords
        .iter()
        .filter(|kw| lower.contains(&format!(" {kw} ")))
        .count();

    found >= 3
        && Regex::new(
            r"(select\s+.+\s+from|insert\s+into\s+.+\s+values|update\s+.+\s+set|delete\s+from\s+.+\s+where|create\s+table\s+|drop\s+table\s+)",
        )
        .unwrap()
        .is_match(&lower)
}

#[cfg(test)]
mod tests {
    use super::detect_text_subtype;

    #[test]
    fn detects_basic_subtypes() {
        assert_eq!(detect_text_subtype("https://ecopaste.cn"), Some("url".to_string()));
        assert_eq!(detect_text_subtype("foo@example.com"), Some("email".to_string()));
        assert_eq!(detect_text_subtype("#1677ff"), Some("color".to_string()));
        assert_eq!(detect_text_subtype("cmd"), Some("command".to_string()));
        assert_eq!(
            detect_text_subtype("C:\\\\Windows\\\\System32"),
            Some("path".to_string())
        );
    }

    #[test]
    fn detects_markdown_and_code() {
        assert_eq!(
            detect_text_subtype("# Title\n\n- item"),
            Some("markdown".to_string())
        );
        assert_eq!(
            detect_text_subtype("fn main() {\n    println!(\"hi\");\n}"),
            Some("code_rust".to_string())
        );
    }
}
