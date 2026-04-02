import clsx from "clsx";
import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { useSnapshot } from "valtio";
import { globalStore } from "@/stores/global";

export interface SyntaxHighlighterProps {
  value: string;
  language?: string;
  className?: string;
  expanded?: boolean;
}

const SyntaxHighlighter = ({
  value,
  language = "text",
  className,
  expanded = false,
}: SyntaxHighlighterProps) => {
  const { appearance } = useSnapshot(globalStore);
  const { isDark } = appearance;
  const [htmlContent, setHtmlContent] = useState<string>("");

  useEffect(() => {
    if (!value) {
      setHtmlContent("");
      return;
    }

    let isMounted = true;
    const lang = language === "html" || language === "xml" ? "html" : language;

    codeToHtml(value, {
      lang,
      theme: isDark ? "dark-plus" : "light-plus",
    })
      .then((html) => {
        if (isMounted) setHtmlContent(html);
      })
      .catch(() => {
        // 回退方案
        if (isMounted) {
          setHtmlContent(`<div><pre><code>${value}</code></pre></div>`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, language, isDark, expanded]);

  const rootClasses = clsx(
    "syntax-highlighter-preview max-w-full overflow-hidden whitespace-pre-wrap break-words font-mono text-sm leading-relaxed p-2 rounded-md",
    "font-['Maple_Mono_NF_CN',_Consolas,'Courier_New',monospace]",
    className,
    // 透传背景色，让外层容器控制背景
    "[&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0",
  );

  if (!htmlContent) {
    return (
      <div className={rootClasses}>
        <pre>
          <code>{value}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className={rootClasses}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default SyntaxHighlighter;
