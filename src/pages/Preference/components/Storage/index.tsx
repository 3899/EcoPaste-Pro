import { useReactive } from "ahooks";
import { Spin } from "antd";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { LISTEN_KEY } from "@/constants";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import SavePath from "../Backup/components/SavePath";
import AutoClean from "./components/AutoClean";
import StorageStats from "./components/StorageStats";

export interface State {
	spinning: boolean;
}

const Storage = ({ active }: { active?: boolean }) => {
	const state = useReactive<State>({
		spinning: false,
	});

	// 每次 Storage active 或窗口重新激活时递增 refreshKey 以触发刷新
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		if (active) {
			setRefreshKey((k) => k + 1);
		}
	}, [active]);

	useTauriFocus({
		onFocus: () => {
			if (active) {
				setRefreshKey((k) => k + 1);
			}
		},
	});

	useEffect(() => {
		const unlisten = listen(LISTEN_KEY.SHOW_WINDOW, () => {
			if (active) {
				setRefreshKey((k) => k + 1);
			}
		});

		return () => {
			unlisten.then((fn) => fn());
		};
	}, [active]);

	return (
		<>
			<Spin fullscreen percent="auto" spinning={state.spinning} />

			<StorageStats refreshKey={refreshKey} />

			<SavePath state={state} />

			<AutoClean />
		</>
	);
};

export default Storage;
