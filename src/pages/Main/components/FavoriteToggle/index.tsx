import { StarFilled, StarOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useContext } from "react";
import { MainContext } from "../..";

const FavoriteToggle = () => {
  const { rootState } = useContext(MainContext);
  const isChecked = rootState.group === "favorite";

  const Icon = isChecked ? StarFilled : StarOutlined;

  return (
    <Icon
      className={clsx("cursor-pointer transition-colors hover:text-primary", {
        "text-gold!": isChecked,
      })}
      onClick={() => {
        if (isChecked) {
          rootState.group = "all"; // Toggle off
        } else {
          rootState.group = "favorite"; // Toggle on
        }
      }}
      title="收藏"
    />
  );
};

export default FavoriteToggle;
