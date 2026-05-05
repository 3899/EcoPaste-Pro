import { invoke } from "@tauri-apps/api/core";
import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { useCreation } from "ahooks";
import { Flex } from "antd";
import clsx from "clsx";
import { filesize } from "filesize";
import { type FC, type MouseEvent, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import { MainContext } from "@/pages/Main";
import { transferData } from "@/pages/Preference/components/Clipboard/components/OperationButton";
import { pasteToClipboard, writeToClipboard } from "@/plugins/clipboard";
import { clipboardStore } from "@/stores/clipboard";
import { transferStore } from "@/stores/transfer";
import type { DatabaseSchemaHistory } from "@/types/database";
import type { OperationButton } from "@/types/store";
import { dayjs } from "@/utils/dayjs";
import { buildTransferPushItem } from "@/utils/transferPushItem";

const REMOTE_SOURCE_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024'><path fill='%231E88FE' d='M512 1024C229.248 1024 0 794.752 0 512S229.248 0 512 0s512 229.248 512 512-229.248 512-512 512z m142.250667-848.469333H369.749333c-26.453333 0-47.914667 20.992-47.914666 46.848v539.946666a47.36 47.36 0 0 0 47.914666 46.848h284.501334c26.453333 0 47.914667-20.992 47.914666-46.848V222.378667c0-25.856-21.461333-46.848-47.914666-46.848z m-181.845334 21.930666h79.274667c4.565333 0 8.234667 3.669333 8.234667 8.32a8.234667 8.234667 0 0 1-8.234667 8.234667h-79.274667a8.234667 8.234667 0 0 1-8.234666-8.234667 8.234667 8.234667 0 0 1 8.234666-8.32zM512 780.416a31.36 31.36 0 0 1-31.701333-31.018667c0-17.066667 14.208-30.976 31.701333-30.976s31.701333 13.866667 31.701333 30.976a31.36 31.36 0 0 1-31.701333 31.018667z m165.205333-130.346667c0 10.325333-8.533333 18.773333-19.157333 18.773334H365.952a18.901333 18.901333 0 0 1-19.157333-18.773334V252.16c0-10.325333 8.533333-18.773333 19.157333-18.773333h292.096c10.581333 0 19.157333 8.405333 19.157333 18.773333v397.866667z'/></svg>";

interface HeaderProps {
  data: DatabaseSchemaHistory;
  handleNote: () => void;
  handleFavorite: () => void;
  handleDelete: (options?: { skipConfirm?: boolean }) => void;
  handleEdit: () => void;
}

const Header: FC<HeaderProps> = (props) => {
  const { data } = props;
  const { id, type, value, count, createTime, favorite, subtype } = data;
  const { rootState } = useContext(MainContext);
  const { t, i18n } = useTranslation();
  const { content } = useSnapshot(clipboardStore);

  const operationButtons = useCreation(() => {
    return content.operationButtons.map((key) => {
      return transferData.find((data) => data.key === key)!;
    });
  }, [content.operationButtons]);

  const renderType = () => {
    switch (subtype) {
      case "url":
        return t("clipboard.label.link");
      case "email":
        return t("clipboard.label.email");
      case "color":
        return t("clipboard.label.color");
      case "path":
        return t("clipboard.label.path");
      case "command":
        return t("clipboard.label.command");
    }

    if (subtype === "markdown") {
      return "Markdown";
    }

    if (subtype?.startsWith("code_")) {
      const lang = subtype.replace("code_", "");
      let displayLang = lang.charAt(0).toUpperCase() + lang.slice(1);
      if (lang === "cpp") displayLang = "C++";
      else if (lang === "csharp") displayLang = "C#";
      else if (lang === "javascript") displayLang = "JS";
      else if (lang === "typescript") displayLang = "TS";
      else if (lang === "html") displayLang = "HTML";
      else if (lang === "css") displayLang = "CSS";
      else if (lang === "json") displayLang = "JSON";
      else if (lang === "sql") displayLang = "SQL";
      else if (lang === "svg") displayLang = "SVG";

      return t("clipboard.label.code", { replace: [displayLang] });
    }

    switch (type) {
      case "text":
        return t("clipboard.label.plain_text");
      case "rtf":
        return t("clipboard.label.rtf");
      case "html":
        return t("clipboard.label.html");
      case "image":
        return t("clipboard.label.image");
      case "files":
        return t("clipboard.label.n_files", {
          replace: [value.length],
        });
    }
  };

  const renderCount = () => {
    if (type === "files" || type === "image") {
      return filesize(count, { standard: "jedec" });
    }

    return t("clipboard.label.n_chars", {
      replace: [count],
    });
  };

  const renderPixel = () => {
    if (type !== "image") return;

    const { width, height } = data;

    return `${width}×${height}`;
  };

  const handleClick = (event: MouseEvent, key: OperationButton) => {
    const { handleNote, handleFavorite, handleDelete, handleEdit } = props;

    event.stopPropagation();

    switch (key) {
      case "copy":
        return writeToClipboard(data);
      case "pastePlain":
        return pasteToClipboard(data, true, { pinned: rootState.pinned });
      case "note":
        return handleNote();
      case "star":
        return handleFavorite();
      case "delete":
        return handleDelete({
          skipConfirm:
            content.deleteSkipConfirmWithShift &&
            event.button === 0 &&
            event.shiftKey,
        });
      case "openBrowser": {
        const urlStr = value as string;
        return openUrl(urlStr.startsWith("http") ? urlStr : `http://${urlStr}`);
      }
      case "previewImage":
        return openPath(value as string);
      case "edit":
        return handleEdit();
      case "openFolder":
        if (type === "text") {
          if (subtype === "command") {
            return openPath(value as string);
          }
          const strValue = value as string;
          if (strValue.includes("%")) {
            import("@/utils/winPaths").then(({ expandEnvVars }) => {
              expandEnvVars(strValue).then((expanded) => openPath(expanded));
            });
            return;
          }
          if (strValue.toLowerCase().startsWith("shell:")) {
            return openPath(strValue);
          }
          return revealItemInDir(strValue);
        } else if (type === "image") {
          const path = Array.isArray(value) ? value[0] : (value as string);
          return revealItemInDir(path);
        } else if (type === "files") {
          return revealItemInDir((value as string[])[0]);
        }
        break;
      case "runCommand":
        return openPath(value as string);
      case "push":
        import("@/stores/transfer").then(async ({ transferStore: ts }) => {
          try {
            const config = await invoke("plugin:transfer|get_transfer_config");
            if (!config) {
              return;
            }
            const providers = [
              ts.push.barkEnabled ? "bark" : null,
              ts.push.webhookEnabled ? "webhook" : null,
            ].filter(Boolean);

            if (providers.length === 0) {
              return;
            }

            await invoke("plugin:transfer|push_clipboard_item", {
              config,
              item: buildTransferPushItem(data),
              nonSensitive: {
                bark_archive: ts.push.barkArchive,
                bark_auto_copy: ts.push.barkAutoCopy,
                bark_group_mapping: ts.push.barkGroupMapping,
                bark_group_mode: ts.push.barkGroupMode,
                bark_level: ts.push.barkLevel,
                image_local_directory: ts.push.imageLocalDirectory,
                image_strategy: ts.push.imageStrategy,
                image_ttl_seconds: ts.push.imageTtlSeconds,
                providers,
                service_port: ts.receive.port,
                webhook_payload_template: ts.push.webhookPayloadTemplate,
              },
            });
          } catch {
            // 静默失败
          }
        });
        return;
    }
  };

  const fullTextInfo = [
    data.sourceAppName,
    renderType(),
    renderCount(),
    renderPixel(),
    dayjs(createTime).format("YY/M/D H:mm"),
  ]
    .filter(Boolean)
    .join(" · ");

  const timeDisplay =
    dayjs().diff(dayjs(createTime), "days") > 3
      ? dayjs(createTime).format("YY/M/D H:mm")
      : dayjs(createTime).locale(i18n.language).fromNow();

  const hasRenderableSourceIcon =
    !!data.sourceAppIcon &&
    !(
      data.isFromSync &&
      !/^(data:image\/|https?:\/\/|blob:|\/|[A-Za-z]:[\\/])/.test(
        data.sourceAppIcon,
      )
    );

  const shouldUseRemoteDeviceIcon =
    !hasRenderableSourceIcon &&
    !!data.sourceAppName &&
    (data.isFromSync || data.sourceAppName.toLowerCase() === "iphone");

  return (
    <div className="relative flex h-[22px] items-center text-color-2">
      <div
        className="flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap text-[11px]"
        title={fullTextInfo}
      >
        {hasRenderableSourceIcon && data.sourceAppIcon && (
          <img
            alt={data.sourceAppName}
            className="h-3.5 w-3.5 flex-shrink-0 rounded-sm object-contain"
            src={data.sourceAppIcon}
            title={data.sourceAppName}
          />
        )}
        {!hasRenderableSourceIcon &&
          data.sourceAppName &&
          (shouldUseRemoteDeviceIcon ? (
            <img
              alt={data.sourceAppName}
              className="h-3.5 w-3.5 flex-shrink-0 rounded-sm object-contain opacity-85"
              src={REMOTE_SOURCE_ICON}
              title={data.sourceAppName}
            />
          ) : (
            <span
              className="flex-shrink-0 text-12 opacity-70"
              title={data.sourceAppName}
            >
              [{data.sourceAppName}]
            </span>
          ))}
        <span className="flex-shrink-0">{renderType()}</span>
        <span className="flex-shrink-0">{renderCount()}</span>
        {renderPixel() && (
          <span className="flex-shrink-0">{renderPixel()}</span>
        )}
        <span className="truncate">{timeDisplay}</span>
      </div>

      <Flex
        align="center"
        className={clsx(
          "absolute right-0 pl-2 opacity-0 transition group-hover:opacity-100",
          {
            "bg-color-1": rootState.activeId !== id,
            "bg-primary-1": rootState.activeId === id,
            "opacity-100": rootState.activeId === id,
          },
        )}
        gap={6}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {operationButtons.map((item) => {
          const { key, Icon, ActiveIcon, title } = item;

          if (key === "openBrowser" && subtype !== "url") return null;
          if (key === "previewImage" && type !== "image") return null;
          if (key === "pastePlain" && type === "image") return null;
          if (
            key === "edit" &&
            type !== "text" &&
            type !== "html" &&
            type !== "rtf"
          )
            return null;
          if (
            key === "openFolder" &&
            type !== "files" &&
            subtype !== "path" &&
            type !== "image"
          )
            return null;
          if (key === "runCommand" && subtype !== "command") return null;
          if (
            key === "push" &&
            (!transferStore.push.masterEnabled ||
              (!transferStore.push.barkEnabled &&
                !transferStore.push.webhookEnabled))
          )
            return null;

          const isFavorite = key === "star" && favorite;
          const OperationIcon = isFavorite ? (ActiveIcon ?? Icon) : Icon;

          return (
            <OperationIcon
              className={clsx(
                "cursor-pointer transition-colors hover:text-primary",
                { "text-gold!": isFavorite },
              )}
              key={key}
              onClick={(event) => handleClick(event, key)}
              title={t(title)}
            />
          );
        })}
      </Flex>
    </div>
  );
};

export default Header;
