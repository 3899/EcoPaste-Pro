import { Flex } from "antd";
import clsx from "clsx";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import UnoIcon from "@/components/UnoIcon";
import { showWindow } from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import { globalStore } from "@/stores/global";
import { isLinux, isWin } from "@/utils/is";
import { MainContext } from "../../index";
import DateFilter from "../DateFilter";
import FavoriteToggle from "../FavoriteToggle";
import GroupList from "../GroupList";
import HistoryList from "../HistoryList";
import SearchInput from "../SearchInput";
import WindowPin from "../WindowPin";

const StandardMode = () => {
  const { search } = useSnapshot(clipboardStore);
  const { appearance } = useSnapshot(globalStore);
  const { rootState } = useContext(MainContext);
  const { t } = useTranslation();

  const viewMode = appearance.viewMode || "top";
  const showFavoriteTags = appearance.showFavoriteTags ?? true;
  const userTags = appearance.favoriteTags || ["text", "image", "links"];

  const allFilters = [
    {
      icon: "i-lucide:layout-grid",
      id: "all",
      label: t("clipboard.label.tab.all"),
    },
    { icon: "i-lucide:type", id: "text", label: t("clipboard.label.tab.text") },
    {
      icon: "i-lucide:image",
      id: "image",
      label: t("clipboard.label.tab.image"),
    },
    {
      icon: "i-lucide:link",
      id: "links",
      label: t("clipboard.label.tab.links", "链接"),
    },
    {
      icon: "i-lucide:palette",
      id: "colors",
      label: t("clipboard.label.tab.colors", "颜色"),
    },
    {
      icon: "i-lucide:mail",
      id: "email",
      label: t("clipboard.label.tab.email", "邮箱"),
    },
    {
      icon: "i-lucide:code",
      id: "code",
      label: t("clipboard.label.tab.code", "代码"),
    },
    {
      icon: "i-lucide:file-box",
      id: "files",
      label: t("clipboard.label.tab.files"),
    },
  ];

  const favoriteSubFilters = allFilters.filter(
    (item) => item.id === "all" || userTags.includes(item.id),
  );

  // 智能安全机制：若当前的子筛选类型被用户在设置中取消勾选，则自动回落到“全部”
  const currentFavFilter = rootState.favoriteFilter || "all";
  if (currentFavFilter !== "all" && !userTags.includes(currentFavFilter)) {
    rootState.favoriteFilter = "all";
  }

  const presetGroups = [
    {
      icon: "i-lucide:layout-grid",
      id: "all",
      name: t("clipboard.label.tab.all"),
    },
    {
      icon: "i-lucide:type",
      id: "text",
      name: t("clipboard.label.tab.text"),
    },
    {
      icon: "i-lucide:image",
      id: "image",
      name: t("clipboard.label.tab.image"),
    },
    {
      icon: "i-lucide:link",
      id: "links",
      name: t("clipboard.label.tab.links", "链接"),
    },
    {
      icon: "i-lucide:palette",
      id: "colors",
      name: t("clipboard.label.tab.colors", "颜色"),
    },
    {
      icon: "i-lucide:mail",
      id: "email",
      name: t("clipboard.label.tab.email", "邮箱"),
    },
    {
      icon: "i-lucide:code",
      id: "code",
      name: t("clipboard.label.tab.code", "代码"),
    },
    {
      icon: "i-lucide:file-box",
      id: "files",
      name: t("clipboard.label.tab.files"),
    },
  ];

  if (viewMode === "side") {
    return (
      <Flex
        className={clsx("h-screen overflow-hidden bg-color-1", {
          "b b-color-1": isLinux,
          "rounded-2.5": !isWin,
        })}
        data-tauri-drag-region
      >
        {/* 左侧极窄侧边栏 */}
        <Flex
          align="center"
          className="b-color-2 h-full w-12 flex-shrink-0 border-r border-solid py-4"
          data-tauri-drag-region
          justify="space-between"
          vertical
        >
          <Flex align="center" className="w-full" gap={16} vertical>
            {/* 剪贴板 logo */}
            <img
              alt="logo"
              className="h-6 w-6 select-none object-contain"
              data-tauri-drag-region
              src="/logo.png"
            />

            {/* 分组图标（增加上间距） */}
            <Flex align="center" className="mt-2 w-full" gap={14} vertical>
              {presetGroups.map((item) => {
                const { id, name, icon } = item;
                const isChecked = id === rootState.group;

                return (
                  <UnoIcon
                    className={clsx(
                      "cursor-pointer text-lg! transition-colors",
                      isChecked ? "text-primary!" : "text-color-2",
                    )}
                    hoverable
                    id={id}
                    key={id}
                    name={icon}
                    onClick={() => {
                      rootState.group = id;
                    }}
                    title={name}
                  />
                );
              })}
            </Flex>

            {/* 短横线分隔 */}
            <div className="b-color-2 w-5 border-t border-solid opacity-60" />

            {/* 收藏按钮 */}
            <UnoIcon
              className={clsx(
                "cursor-pointer text-lg! transition-colors hover:text-primary",
                {
                  "text-gold!": rootState.group === "favorite",
                },
              )}
              hoverable
              name={
                rootState.group === "favorite"
                  ? "i-iconamoon:star-fill"
                  : "i-iconamoon:star"
              }
              onClick={() => {
                if (rootState.group === "favorite") {
                  rootState.group = "all";
                } else {
                  rootState.group = "favorite";
                  rootState.favoriteFilter = "all";
                }
              }}
              title="收藏"
            />
          </Flex>

          {/* 设置按钮上方分隔线并居中隔开 */}
          <Flex align="center" className="w-full" gap={12} vertical>
            <div className="b-color-2 w-5 border-t border-solid opacity-60" />
            <UnoIcon
              className="cursor-pointer text-color-2 text-lg!"
              hoverable
              name="i-lets-icons:setting-alt-line"
              onClick={() => {
                showWindow("preference");
              }}
              title={t("clipboard.button.setting")}
            />
          </Flex>
        </Flex>

        {/* 右侧主容器 */}
        <Flex
          className="flex-1 overflow-hidden py-3"
          data-tauri-drag-region
          gap={12}
          vertical
        >
          {/* 搜索框 & 日期标签筛选 & 钉住 */}
          <Flex
            align="center"
            className="w-full flex-shrink-0 px-3"
            data-tauri-drag-region
            gap={12}
          >
            <SearchInput className="flex-1" />
            <Flex align="center" className="text-color-2 text-lg" gap={12}>
              <DateFilter />
              <WindowPin />
            </Flex>
          </Flex>

          {/* 收藏夹子分组筛选（居中对齐，支持开关配置） */}
          {rootState.group === "favorite" && showFavoriteTags && (
            <Flex
              align="center"
              className="flex-shrink-0 flex-wrap px-3"
              data-tauri-drag-region
              gap={14}
            >
              {favoriteSubFilters.map((sub) => {
                const active = (rootState.favoriteFilter || "all") === sub.id;
                return (
                  <UnoIcon
                    className={clsx(
                      "cursor-pointer text-lg! transition-colors",
                      active ? "text-primary!" : "text-color-2",
                    )}
                    hoverable
                    key={sub.id}
                    name={sub.icon}
                    onClick={() => {
                      rootState.favoriteFilter = sub.id as any;
                    }}
                    title={sub.label}
                  />
                );
              })}
            </Flex>
          )}

          {/* 剪贴板历史记录容器 */}
          <HistoryList />
        </Flex>
      </Flex>
    );
  }

  // 默认顶栏导航样式 (Top Navigation)
  return (
    <Flex
      className={clsx("h-screen bg-color-1 py-3", {
        "b b-color-1": isLinux,
        "flex-col-reverse": search.position === "bottom",
        "rounded-2.5": !isWin,
      })}
      data-tauri-drag-region
      gap={12}
      vertical
    >
      <Flex align="center" className="px-3" gap={12}>
        <SearchInput className="flex-1" />
        <Flex align="center" className="text-color-2 text-lg" gap={12}>
          <WindowPin />
          <UnoIcon
            hoverable
            name="i-lets-icons:setting-alt-line"
            onClick={() => {
              showWindow("preference");
            }}
            title={t("clipboard.button.setting")}
          />
        </Flex>
      </Flex>

      <Flex
        className="flex-1 overflow-hidden"
        data-tauri-drag-region
        gap={12}
        vertical
      >
        <Flex
          align="center"
          className="overflow-hidden px-3"
          data-tauri-drag-region
          justify="space-between"
        >
          <GroupList />

          <Flex align="center" className="text-color-2 text-lg" gap={10}>
            <FavoriteToggle />
            <DateFilter />
          </Flex>
        </Flex>

        <HistoryList />
      </Flex>
    </Flex>
  );
};

export default StandardMode;
