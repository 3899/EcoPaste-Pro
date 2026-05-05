import { PushpinFilled } from "@ant-design/icons";
import { useKeyPress } from "ahooks";
import clsx from "clsx";
import { useContext } from "react";
import { PRESET_SHORTCUT } from "@/constants";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import { hideWindow } from "@/plugins/window";
import { MainContext } from "../..";

const WindowPin = () => {
  const { rootState } = useContext(MainContext);

  useKeyPress(PRESET_SHORTCUT.FIXED_WINDOW, () => {
    togglePin();
  });

  useTauriFocus({
    onBlur() {
      if (rootState.pinned) return;

      hideWindow();
    },
  });

  const togglePin = () => {
    rootState.pinned = !rootState.pinned;
  };

  return (
    <PushpinFilled
      className={clsx("cursor-pointer transition-colors hover:text-primary", {
        "-rotate-45": !rootState.pinned,
        "text-primary": rootState.pinned,
      })}
      onMouseDown={togglePin}
    />
  );
};

export default WindowPin;
