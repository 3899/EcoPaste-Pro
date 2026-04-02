import { useEventEmitter, useKeyPress, useMount, useReactive } from "ahooks";
import type { EventEmitter } from "ahooks/lib/useEventEmitter";
import { range } from "es-toolkit";
import { find, last } from "es-toolkit/compat";
import { createContext, useRef } from "react";
import { startListening, stopListening } from "tauri-plugin-clipboard-x-api";
import { useSnapshot } from "valtio";
import Audio, { type AudioRef } from "@/components/Audio";
import { LISTEN_KEY, PRESET_SHORTCUT } from "@/constants";
import { useClipboard } from "@/hooks/useClipboard";
import { useImmediateKey } from "@/hooks/useImmediateKey";
import { useRegister } from "@/hooks/useRegister";
import { useSubscribeKey } from "@/hooks/useSubscribeKey";
import { useTauriListen } from "@/hooks/useTauriListen";
import { markInternalClipboardWrite, pasteToClipboard } from "@/plugins/clipboard";
import {
  showTaskbarIcon,
  showWindow,
  toggleWindowVisible,
} from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import { globalStore } from "@/stores/global";
import { transferStore } from "@/stores/transfer";
import type {
  DatabaseSchemaGroupId,
  DatabaseSchemaHistory,
} from "@/types/database";
import type { Store } from "@/types/store";
import { strictDeepAssign } from "@/utils/object";
import DockMode from "./components/DockMode";
import StandardMode from "./components/StandardMode";

interface EventBusPayload {
  id: string;
  action: string;
}

export interface State {
  group: DatabaseSchemaGroupId;
  search?: string;
  pinned?: boolean;
  activeId?: string;
  list: DatabaseSchemaHistory[];
  eventBus?: EventEmitter<EventBusPayload>;
  quickPasteKeys: string[];
  expandedIds: string[];
  dateRange?: [number, number];
  filterTags?: string[];
}

const INITIAL_STATE: State = {
  expandedIds: [],
  group: "all",
  list: [],
  quickPasteKeys: [],
};

interface MainContextValue {
  rootState: State;
}

export const MainContext = createContext<MainContextValue>({
  rootState: INITIAL_STATE,
});

const Main = () => {
  const state = useReactive<State>(INITIAL_STATE);
  const { shortcut } = useSnapshot(globalStore);
  const { window } = useSnapshot(clipboardStore);
  const eventBus = useEventEmitter<EventBusPayload>();
  const audioRef = useRef<AudioRef>(null);

  useMount(() => {
    state.eventBus = eventBus;
  });

  useClipboard(state, {
    beforeRead() {
      if (!clipboardStore.audio.copy) return;

      audioRef.current?.play();
    },
  });

  useImmediateKey(globalStore.app, "showTaskbarIcon", showTaskbarIcon);

  useTauriListen<Store>(LISTEN_KEY.STORE_CHANGED, ({ payload }) => {
    strictDeepAssign(globalStore, payload.globalStore);
    strictDeepAssign(clipboardStore, payload.clipboardStore);
    if (payload.transferStore) {
      strictDeepAssign(transferStore, payload.transferStore);
    }
  });

  useRegister(toggleWindowVisible, [shortcut.clipboard]);

  useKeyPress(PRESET_SHORTCUT.OPEN_PREFERENCES, () => {
    showWindow("preference");
  });

  const setQuickPasteKeys = () => {
    const { enable, value } = globalStore.shortcut.quickPaste;

    if (!enable) {
      state.quickPasteKeys = [];
      return;
    }

    state.quickPasteKeys = range(1, 10).map((item) => [value, item].join("+"));
  };

  useImmediateKey(globalStore.shortcut.quickPaste, "enable", () => {
    setQuickPasteKeys();
  });

  useSubscribeKey(globalStore.shortcut.quickPaste, "value", () => {
    setQuickPasteKeys();
  });

  useTauriListen<boolean>(LISTEN_KEY.TOGGLE_LISTEN_CLIPBOARD, ({ payload }) => {
    if (payload) {
      startListening();
    } else {
      stopListening();
    }
  });

  useTauriListen<string>(LISTEN_KEY.TRANSFER_AUTOCOPY_GUARD, ({ payload }) => {
    markInternalClipboardWrite(payload === "image");
  });

  useRegister(
    async () => {
      const { getCurrentWebviewWindow } = await import(
        "@tauri-apps/api/webviewWindow"
      );
      const { isLinux } = await import("@/utils/is");
      const appWindow = getCurrentWebviewWindow();

      let focused = await appWindow.isFocused();

      if (isLinux) {
        focused = await appWindow.isVisible();
      }

      const targetId = focused ? state.activeId : state.list[0]?.id;
      const data = find(state.list, { id: targetId });

      if (!data) return;

      pasteToClipboard(data, true, { pinned: state.pinned });
    },
    [shortcut.pastePlain],
  );

  useRegister(
    async (event) => {
      if (!globalStore.shortcut.quickPaste.enable) return;

      const index = Number(last(event.shortcut));
      const data = state.list[index - 1];

      pasteToClipboard(data, undefined, { pinned: state.pinned });
    },
    [state.quickPasteKeys],
  );

  return (
    <MainContext.Provider
      value={{
        rootState: state,
      }}
    >
      <Audio ref={audioRef} />
      {window.style === "standard" ? <StandardMode /> : <DockMode />}
    </MainContext.Provider>
  );
};

export default Main;
