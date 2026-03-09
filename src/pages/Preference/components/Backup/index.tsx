import { useReactive } from "ahooks";
import { Spin } from "antd";
import Manual from "./components/Manual";
import Webdav from "./components/Webdav";

export interface State {
  spinning: boolean;
}

const Backup = () => {
  const state = useReactive<State>({
    spinning: false,
  });

  return (
    <>
      <Spin fullscreen percent="auto" spinning={state.spinning} />

      <Webdav state={state} />

      <Manual state={state} />
    </>
  );
};

export default Backup;
