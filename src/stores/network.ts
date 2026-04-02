import { invoke } from "@tauri-apps/api/core";
import { proxy } from "valtio";

interface NetworkStore {
  lanIp: string;
}

interface NetworkInfoPayload {
  lan_ip: string;
}

export const networkStore = proxy<NetworkStore>({
  lanIp: "127.0.0.1",
});

export const refreshNetworkInfo = async () => {
  const info = await invoke<NetworkInfoPayload>("plugin:transfer|get_network_info");
  networkStore.lanIp = info.lan_ip;
  return info;
};
