import {
  AppstoreOutlined,
  BgColorsOutlined,
  CodeOutlined,
  FileOutlined,
  FontSizeOutlined,
  LinkOutlined,
  MailOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useKeyPress } from "ahooks";
import clsx from "clsx";
import type { ComponentType } from "react";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Scrollbar from "@/components/Scrollbar";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaGroup } from "@/types/database";
import { scrollElementToCenter } from "@/utils/dom";
import { MainContext } from "../..";

const GroupList = () => {
  const { rootState } = useContext(MainContext);
  const { t } = useTranslation();

  useEffect(() => {
    scrollElementToCenter(rootState.group);
  }, [rootState.group]);

  useTauriFocus({
    onBlur() {
      if (clipboardStore.window.showAll) {
        rootState.group = "all";
      }
    },
  });

  const presetGroups: (DatabaseSchemaGroup & {
    Icon: ComponentType<{ className?: string }>;
  })[] = [
    {
      Icon: AppstoreOutlined,
      id: "all",
      name: t("clipboard.label.tab.all"),
    },
    {
      Icon: FontSizeOutlined,
      id: "text",
      name: t("clipboard.label.tab.text"),
    },
    {
      Icon: PictureOutlined,
      id: "image",
      name: t("clipboard.label.tab.image"),
    },
    {
      Icon: LinkOutlined,
      id: "links",
      name: t("clipboard.label.tab.links", "链接"),
    },
    {
      Icon: BgColorsOutlined,
      id: "colors",
      name: t("clipboard.label.tab.colors", "颜色"),
    },
    {
      Icon: MailOutlined,
      id: "email",
      name: t("clipboard.label.tab.email", "邮箱"),
    },
    {
      Icon: CodeOutlined,
      id: "code",
      name: t("clipboard.label.tab.code", "代码"),
    },
    {
      Icon: FileOutlined,
      id: "files",
      name: t("clipboard.label.tab.files"),
    },
  ];

  useKeyPress("tab", (event) => {
    const index = presetGroups.findIndex((item) => item.id === rootState.group);
    const length = presetGroups.length;

    let nextIndex = index;

    if (event.shiftKey) {
      nextIndex = index === 0 ? length - 1 : index - 1;
    } else {
      nextIndex = index === length - 1 ? 0 : index + 1;
    }

    rootState.group = presetGroups[nextIndex].id;
  });

  return (
    <Scrollbar className="min-w-0 flex-1" data-tauri-drag-region>
      <div className="flex h-6 items-center gap-[10px]">
        {presetGroups.map((item) => {
          const { id, name, Icon } = item;
          const isChecked = id === rootState.group;

          return (
            <Icon
              className={clsx(
                "flex-shrink-0 cursor-pointer text-lg! transition-colors",
                isChecked ? "text-primary!" : "text-color-2",
              )}
              id={id}
              key={id}
              onClick={() => {
                rootState.group = id;
              }}
              title={name}
            />
          );
        })}
      </div>
    </Scrollbar>
  );
};

export default GroupList;
