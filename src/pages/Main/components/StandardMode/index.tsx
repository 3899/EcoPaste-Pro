import { SettingOutlined } from "@ant-design/icons";
import { Flex } from "antd";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import { showWindow } from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import { isLinux, isWin } from "@/utils/is";
import DateFilter from "../DateFilter";
import FavoriteToggle from "../FavoriteToggle";
import GroupList from "../GroupList";
import HistoryList from "../HistoryList";
import HistoryScopeToggle from "../HistoryScopeToggle";
import SearchInput from "../SearchInput";
import WindowPin from "../WindowPin";

const StandardMode = () => {
  const { search } = useSnapshot(clipboardStore);
  const { t } = useTranslation();

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
          <SettingOutlined
            className="cursor-pointer transition-colors hover:text-primary"
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
          className="h-6 shrink-0 overflow-hidden px-3"
          data-tauri-drag-region
          justify="space-between"
        >
          <GroupList />

          <Flex align="center" className="text-color-2 text-lg" gap={10}>
            <FavoriteToggle />
            <HistoryScopeToggle />
            <DateFilter />
          </Flex>
        </Flex>

        <HistoryList />
      </Flex>
    </Flex>
  );
};

export default StandardMode;
