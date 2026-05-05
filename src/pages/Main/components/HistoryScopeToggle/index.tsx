import { ClockCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useContext } from "react";
import { MainContext } from "../..";

const HistoryScopeToggle = () => {
  const { rootState } = useContext(MainContext);
  const isAll = rootState.historyScope === "all";
  const Icon = isAll ? HistoryOutlined : ClockCircleOutlined;

  return (
    <Icon
      className={clsx("cursor-pointer text-[1.05rem] transition-colors", {
        "text-color-2 hover:text-primary": !isAll,
        "text-primary": isAll,
      })}
      onClick={() => {
        rootState.historyScope = isAll ? "recent" : "all";
      }}
      title={isAll ? "全部历史" : "最近 7 天"}
    />
  );
};

export default HistoryScopeToggle;
