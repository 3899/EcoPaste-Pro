import DOMPurify from "dompurify";
import {
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  useContext,
  useMemo,
} from "react";
import { Marker } from "react-mark.js";
import { useSnapshot } from "valtio";
import { MainContext } from "@/pages/Main";
import { clipboardStore } from "@/stores/clipboard";
import { globalStore } from "@/stores/global";

interface SafeHtmlProps {
  value: string;
  expanded?: boolean;
}

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ContrastCandidate {
  color: RgbaColor;
  css: string;
  ratio: number;
}

const SafeHtml = forwardRef<HTMLDivElement, SafeHtmlProps>((props, ref) => {
  const { value, expanded } = props;
  const { rootState } = useContext(MainContext);
  const { content } = useSnapshot(clipboardStore);
  const {
    appearance: { isDark },
  } = useSnapshot(globalStore);

  const displayLines = content.displayLines || 4;

  const handleClick = (event: MouseEvent) => {
    const { target, metaKey, ctrlKey } = event;

    const link = (target as HTMLElement).closest("a");

    if (!link || metaKey || ctrlKey) return;

    event.preventDefault();
    event.stopPropagation();
  };

  // 动态高度限制样式（使用 max-height 替代 -webkit-line-clamp，兼容块级 HTML 内容）
  const getLineClampStyle = (): CSSProperties => {
    if (expanded) {
      return {};
    }
    return {
      maxHeight: `${displayLines * 1.5}em`,
      overflow: "hidden",
    };
  };

  const renderStyle: CSSProperties = {
    color: "var(--ant-color-text)",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
    wordBreak: "break-word",
    ...getLineClampStyle(),
  };

  const normalizedHtml = useMemo(() => {
    const sanitized = DOMPurify.sanitize(value, {
      FORBID_ATTR: ["target", "controls", "autoplay", "autoPlay"],
    });

    if (typeof document === "undefined") {
      return sanitized;
    }

    const root = document.createElement("div");
    root.innerHTML = sanitized;

    const measureRoot = document.createElement("div");
    measureRoot.className = "safe-html";
    measureRoot.style.position = "fixed";
    measureRoot.style.left = "-99999px";
    measureRoot.style.top = "0";
    measureRoot.style.width = "640px";
    measureRoot.style.visibility = "hidden";
    measureRoot.style.pointerEvents = "none";
    measureRoot.style.color = "var(--ant-color-text)";
    measureRoot.style.backgroundColor = "var(--ant-color-bg-container)";
    measureRoot.style.overflowWrap = "anywhere";
    measureRoot.style.whiteSpace = "normal";
    measureRoot.style.wordBreak = "break-word";
    measureRoot.innerHTML = sanitized;
    document.body.appendChild(measureRoot);

    try {
      const colorProbe = document.createElement("span");
      colorProbe.style.display = "none";
      measureRoot.appendChild(colorProbe);

      const colorCache = new Map<string, RgbaColor | null>();

      const parseColor = (raw?: string | null): RgbaColor | null => {
        const value = raw?.trim();
        if (!value) return null;
        if (value === "transparent") {
          return { a: 0, b: 0, g: 0, r: 0 };
        }

        const match = value.match(
          /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+))?\s*\)/i,
        );
        if (!match) return null;

        return {
          a: match[4] === undefined ? 1 : Number(match[4]),
          b: Number(match[3]),
          g: Number(match[2]),
          r: Number(match[1]),
        };
      };

      const resolveColor = (
        raw?: string | null,
        property: "color" | "backgroundColor" = "color",
      ) => {
        const value = raw?.trim();
        if (!value) return null;

        const cacheKey = `${property}:${value}`;
        if (colorCache.has(cacheKey)) {
          return colorCache.get(cacheKey) ?? null;
        }

        colorProbe.style.setProperty(
          property === "color" ? "color" : "background-color",
          "",
        );
        colorProbe.style[property] = value;
        const resolved = parseColor(getComputedStyle(colorProbe)[property]);
        colorCache.set(cacheKey, resolved);

        return resolved;
      };

      const flattenColor = (fg: RgbaColor, bg: RgbaColor): RgbaColor => {
        if (fg.a >= 1) return { ...fg, a: 1 };
        if (fg.a <= 0) return { ...bg, a: 1 };

        const alpha = fg.a + bg.a * (1 - fg.a);
        if (alpha <= 0) return { a: 1, b: 0, g: 0, r: 0 };

        return {
          a: 1,
          b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / alpha),
          g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / alpha),
          r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / alpha),
        };
      };

      const luminance = ({ r, g, b }: RgbaColor) => {
        const toLinear = (channel: number) => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };

        return (
          0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
        );
      };

      const contrastRatio = (fg: RgbaColor, bg: RgbaColor) => {
        const lighter = Math.max(luminance(fg), luminance(bg));
        const darker = Math.min(luminance(fg), luminance(bg));

        return (lighter + 0.05) / (darker + 0.05);
      };

      const themeText =
        parseColor(getComputedStyle(measureRoot).color) ??
        (isDark
          ? { a: 1, b: 255, g: 255, r: 255 }
          : { a: 1, b: 22, g: 22, r: 22 });
      const themeBackground =
        parseColor(getComputedStyle(measureRoot).backgroundColor) ??
        (isDark
          ? { a: 1, b: 31, g: 31, r: 31 }
          : { a: 1, b: 255, g: 255, r: 255 });
      const themeLightText = resolveColor("var(--ant-color-text-light-solid)") ??
        { a: 1, b: 255, g: 255, r: 255 };
      const themeLinkText = resolveColor("var(--ant-color-link)") ??
        resolveColor("var(--ant-color-primary)") ??
        themeText;
      const themeFill = resolveColor(
        "var(--ant-color-fill-quaternary)",
        "backgroundColor",
      ) ?? themeBackground;

      const hasDirectTextContent = (element: HTMLElement) => {
        return [...element.childNodes].some((node) => {
          return (
            node.nodeType === Node.TEXT_NODE &&
            typeof node.textContent === "string" &&
            node.textContent.trim().length > 0
          );
        });
      };

      const collectTextElements = (container: HTMLElement) => {
        const elements: HTMLElement[] = [];
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_ELEMENT,
        );

        let current = walker.nextNode();
        while (current) {
          if (current instanceof HTMLElement && hasDirectTextContent(current)) {
            elements.push(current);
          }
          current = walker.nextNode();
        }

        return elements;
      };

      const getEffectiveBackground = (element: HTMLElement) => {
        const ancestors: HTMLElement[] = [];
        let current: HTMLElement | null = element;

        while (current && current !== measureRoot) {
          ancestors.unshift(current);
          current = current.parentElement;
        }

        return ancestors.reduce((background, node) => {
          const color = parseColor(getComputedStyle(node).backgroundColor);
          if (!color || color.a <= 0) {
            return background;
          }

          return flattenColor(color, background);
        }, themeBackground);
      };

      const findBestTextCandidate = (
        background: RgbaColor,
        options?: { preferLinkColor?: boolean },
      ) => {
        const candidates: Omit<ContrastCandidate, "ratio">[] = [];

        if (options?.preferLinkColor) {
          candidates.push({
            color: themeLinkText,
            css: "var(--ant-color-link, var(--ant-color-primary))",
          });
        }

        candidates.push(
          { color: themeText, css: "var(--ant-color-text)" },
          { color: themeBackground, css: "var(--ant-color-bg-container)" },
          { color: themeLightText, css: "var(--ant-color-text-light-solid)" },
        );

        return candidates.reduce(
          (best: ContrastCandidate, candidate) => {
            const ratio = contrastRatio(candidate.color, background);
            if (ratio > best.ratio) {
              return { ...candidate, ratio };
            }
            return best;
          },
          {
            color: themeText,
            css: "var(--ant-color-text)",
            ratio: contrastRatio(themeText, background),
          },
        );
      };

      const findBestBackgroundCandidate = (foreground: RgbaColor) => {
        const candidates: Omit<ContrastCandidate, "ratio">[] = [
          { color: themeBackground, css: "var(--ant-color-bg-container)" },
          { color: themeFill, css: "var(--ant-color-fill-quaternary)" },
        ];

        return candidates.reduce(
          (best: ContrastCandidate, candidate) => {
            const ratio = contrastRatio(foreground, candidate.color);
            if (ratio > best.ratio) {
              return { ...candidate, ratio };
            }
            return best;
          },
          {
            color: themeBackground,
            css: "var(--ant-color-bg-container)",
            ratio: contrastRatio(foreground, themeBackground),
          },
        );
      };

      const measureElements = collectTextElements(measureRoot);
      const rootElements = collectTextElements(root);

      measureElements.forEach((measureElement, index) => {
        const element = rootElements[index];
        if (!element) return;

        const computedStyle = getComputedStyle(measureElement);
        const computedForeground = parseColor(computedStyle.color);
        if (!computedForeground) return;

        const background = getEffectiveBackground(measureElement);
        const foreground = flattenColor(computedForeground, background);
        const currentContrast = contrastRatio(foreground, background);
        if (currentContrast >= 4.5) return;

        const isLinkLike =
          measureElement.tagName === "A" || measureElement.closest("a") !== null;
        const bestText = findBestTextCandidate(background, {
          preferLinkColor: isLinkLike,
        });
        element.style.setProperty("color", bestText.css, "important");
        element.removeAttribute("color");
        element.removeAttribute("text");

        if (bestText.ratio >= 4.5) return;

        const bestBackground = findBestBackgroundCandidate(bestText.color);
        element.style.setProperty(
          "background-color",
          bestBackground.css,
          "important",
        );
      });

      return root.innerHTML;
    } finally {
      document.body.removeChild(measureRoot);
    }
  }, [isDark, value]);

  return (
    <Marker mark={rootState.search}>
      <div
        className="safe-html translate-z-0"
        dangerouslySetInnerHTML={{
          __html: normalizedHtml,
        }}
        onClick={handleClick}
        ref={ref}
        style={renderStyle}
      />
    </Marker>
  );
});

SafeHtml.displayName = "SafeHtml";

export default SafeHtml;
