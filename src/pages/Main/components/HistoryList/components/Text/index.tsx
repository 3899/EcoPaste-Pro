import { Flex } from "antd";
import clsx from "clsx";
import { type CSSProperties, forwardRef, useContext } from "react";
import { Marker } from "react-mark.js";
import { useSnapshot } from "valtio";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import { MainContext } from "@/pages/Main";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";

interface TextProps extends DatabaseSchemaHistory<"text"> {
  expanded?: boolean;
}

const Text = forwardRef<HTMLDivElement, TextProps>((props, ref) => {
  const { value, subtype, expanded } = props;
  const { rootState } = useContext(MainContext);
  const { content } = useSnapshot(clipboardStore);

  const displayLines = content.displayLines || 4;
  const codeDisplayLines = content.codeDisplayLines || 5;
  const codePreviewLineHeight = 1.625;
  const codePreviewVerticalPadding = 1;

  const renderMarker = () => {
    return <Marker mark={rootState.search}>{value}</Marker>;
  };

  const toCssColor = (val: string): string => {
    const cmykMatch = val.match(
      /^cmyk\(\s*(\d+)%?\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)$/i,
    );
    if (cmykMatch) {
      const c = Number(cmykMatch[1]) / 100;
      const m = Number(cmykMatch[2]) / 100;
      const y = Number(cmykMatch[3]) / 100;
      const k = Number(cmykMatch[4]) / 100;
      const r = Math.round(255 * (1 - c) * (1 - k));
      const g = Math.round(255 * (1 - m) * (1 - k));
      const b = Math.round(255 * (1 - y) * (1 - k));
      return `rgb(${r}, ${g}, ${b})`;
    }
    return val;
  };

  const renderColor = () => {
    const className = "absolute rounded-full";
    const style: CSSProperties = {
      background: toCssColor(value),
    };

    return (
      <Flex align="center" gap="small">
        <div className="relative h-5.5 min-w-5.5">
          <span
            className={clsx(className, "inset-0 opacity-50")}
            style={style}
          />

          <span className={clsx(className, "inset-0.5")} style={style} />
        </div>

        {renderMarker()}
      </Flex>
    );
  };

  const renderContent = () => {
    if (subtype === "color") {
      return renderColor();
    }

    if (subtype?.startsWith("code_") && content.enableCodeHighlighting) {
      const language = subtype.replace("code_", "");
      return (
        <SyntaxHighlighter
          expanded={expanded}
          language={language}
          value={value}
        />
      );
    }

    return renderMarker();
  };

  // 动态 line-clamp 样式
  const getLineClampStyle = (): CSSProperties => {
    if (subtype?.startsWith("code_") && content.enableCodeHighlighting) {
      if (expanded) return {};

      return {
        maxHeight: `calc(${codeDisplayLines} * ${codePreviewLineHeight}em + ${codePreviewVerticalPadding}rem)`,
        overflow: "hidden",
      };
    }

    if (subtype === "url") {
      if (expanded) {
        return {
          color: "#1677FE",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        };
      }
      return {
        color: "#1677FE",
        display: "-webkit-box",
        overflow: "hidden",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: displayLines,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      };
    }

    if (expanded) {
      return {
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      };
    }
    return {
      display: "-webkit-box",
      overflow: "hidden",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: displayLines,
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
    };
  };

  return (
    <div ref={ref} style={getLineClampStyle()}>
      {renderContent()}
    </div>
  );
});

Text.displayName = "Text";

export default Text;
