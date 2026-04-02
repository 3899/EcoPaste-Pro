use crate::contract::ProcessedPayload;

const DEFAULT_TITLE: &str = "EcoPaste";

pub fn strip_html_tags(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut inside_tag = false;
    let mut inside_entity = false;
    let mut entity_buf = String::new();

    for ch in html.chars() {
        if ch == '<' {
            inside_tag = true;
            continue;
        }
        if ch == '>' && inside_tag {
            inside_tag = false;
            continue;
        }
        if inside_tag {
            continue;
        }

        if ch == '&' {
            inside_entity = true;
            entity_buf.clear();
            entity_buf.push(ch);
            continue;
        }
        if inside_entity {
            entity_buf.push(ch);
            if ch == ';' {
                inside_entity = false;
                match entity_buf.as_str() {
                    "&amp;" => result.push('&'),
                    "&lt;" => result.push('<'),
                    "&gt;" => result.push('>'),
                    "&quot;" => result.push('"'),
                    "&apos;" => result.push('\''),
                    "&nbsp;" => result.push(' '),
                    _ => result.push_str(&entity_buf),
                }
                entity_buf.clear();
            }
            continue;
        }

        result.push(ch);
    }

    if !entity_buf.is_empty() {
        result.push_str(&entity_buf);
    }

    result.trim().to_string()
}

pub fn display_type(content_type: &str, subtype: Option<&str>) -> String {
    match subtype {
        Some("url") => "链接".to_string(),
        Some("email") => "邮箱".to_string(),
        Some("color") => "颜色".to_string(),
        Some("path") => "路径".to_string(),
        Some("command") => "指令".to_string(),
        Some("markdown") => "Markdown".to_string(),
        Some(code) if code.starts_with("code_") => {
            format!("代码({})", format_code_language(&code["code_".len()..]))
        }
        _ => match content_type {
            "text" => "纯文本".to_string(),
            "rtf" => "富文本".to_string(),
            "html" => "HTML".to_string(),
            "image" => "图片".to_string(),
            "files" => "文件(夹)".to_string(),
            other => other.to_string(),
        },
    }
}

pub fn build_display_source(source: &str) -> String {
    let normalized_source = source.trim();

    if normalized_source.is_empty() || normalized_source.eq_ignore_ascii_case(DEFAULT_TITLE) {
        DEFAULT_TITLE.to_string()
    } else {
        format!("{DEFAULT_TITLE} - {normalized_source}")
    }
}

pub fn content_group_key(content_type: &str, subtype: Option<&str>) -> String {
    match subtype {
        Some("url") => "url".to_string(),
        Some("email") => "email".to_string(),
        Some("color") => "color".to_string(),
        Some("path") => "path".to_string(),
        Some("command") => "command".to_string(),
        Some("markdown") => "markdown".to_string(),
        Some(code) if code.starts_with("code_") => "code".to_string(),
        Some(value) if !value.is_empty() => value.to_string(),
        _ => content_type.to_string(),
    }
}

pub fn process_clipboard_item(
    raw_content: &str,
    content_type: &str,
    subtype: Option<&str>,
    source: &str,
) -> Result<ProcessedPayload, String> {
    match content_type {
        "image" => return Err("图片推送需走图片中转策略".to_string()),
        "files" => return Err("文件推送需走中转策略".to_string()),
        _ => {}
    }

    let text = if content_type == "html" {
        strip_html_tags(raw_content)
    } else {
        raw_content.to_string()
    };

    if text.trim().is_empty() {
        return Err("推送内容为空".to_string());
    }

    Ok(ProcessedPayload {
        display_type: display_type(content_type, subtype),
        content_length: text.chars().count(),
        content: text,
        display_source: build_display_source(source),
    })
}

fn format_code_language(language: &str) -> String {
    match language {
        "cpp" => "C++".to_string(),
        "csharp" => "C#".to_string(),
        "javascript" => "JS".to_string(),
        "typescript" => "TS".to_string(),
        "html" => "HTML".to_string(),
        "css" => "CSS".to_string(),
        "json" => "JSON".to_string(),
        "sql" => "SQL".to_string(),
        "svg" => "SVG".to_string(),
        "xml" => "XML".to_string(),
        "yaml" => "YAML".to_string(),
        "php" => "PHP".to_string(),
        "ruby" => "Ruby".to_string(),
        "rust" => "Rust".to_string(),
        "java" => "Java".to_string(),
        "python" => "Python".to_string(),
        "go" => "Go".to_string(),
        "swift" => "Swift".to_string(),
        "kotlin" => "Kotlin".to_string(),
        "scala" => "Scala".to_string(),
        "bash" => "Bash".to_string(),
        "shell" => "Shell".to_string(),
        "powershell" => "PowerShell".to_string(),
        "c" => "C".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                Some(first) => {
                    let mut formatted = first.to_uppercase().collect::<String>();
                    formatted.push_str(chars.as_str());
                    formatted
                }
                None => "代码".to_string(),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_html() {
        let html = "<p>Hello <b>World</b> &amp; everyone</p>";
        assert_eq!(strip_html_tags(html), "Hello World & everyone");
    }

    #[test]
    fn test_display_type_for_basic_types() {
        assert_eq!(display_type("text", None), "纯文本");
        assert_eq!(display_type("text", Some("url")), "链接");
        assert_eq!(display_type("rtf", None), "富文本");
        assert_eq!(display_type("html", None), "HTML");
    }

    #[test]
    fn test_display_type_for_code_subtypes() {
        assert_eq!(display_type("text", Some("code_json")), "代码(JSON)");
        assert_eq!(display_type("text", Some("code_javascript")), "代码(JS)");
        assert_eq!(display_type("text", Some("code_cpp")), "代码(C++)");
    }

    #[test]
    fn test_display_source_uses_source_app_name() {
        assert_eq!(build_display_source("Chrome"), "EcoPaste - Chrome");
        assert_eq!(build_display_source("EcoPaste"), "EcoPaste");
        assert_eq!(build_display_source(""), "EcoPaste");
    }

    #[test]
    fn test_process_clipboard_item_for_html() {
        let payload = process_clipboard_item(
            "<p>Hello <b>World</b></p>",
            "html",
            None,
            "Chrome",
        )
        .unwrap();

        assert_eq!(payload.content, "Hello World");
        assert_eq!(payload.display_type, "HTML");
        assert_eq!(payload.display_source, "EcoPaste - Chrome");
        assert_eq!(payload.content_length, 11);
    }

    #[test]
    fn test_process_clipboard_item_rejects_empty_text() {
        let result = process_clipboard_item("   ", "text", None, "Chrome");
        assert!(result.is_err());
    }

    #[test]
    fn test_content_group_key_for_code_subtype() {
        assert_eq!(content_group_key("text", Some("code_json")), "code");
        assert_eq!(content_group_key("text", Some("url")), "url");
        assert_eq!(content_group_key("text", None), "text");
    }
}
