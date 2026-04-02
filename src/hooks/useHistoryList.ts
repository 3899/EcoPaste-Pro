import { exists } from "@tauri-apps/plugin-fs";
import { useAsyncEffect, useReactive } from "ahooks";
import { isString } from "es-toolkit";
import { unionBy } from "es-toolkit/compat";
import { useContext, useRef } from "react";
import { LISTEN_KEY } from "@/constants";
import { selectHistory } from "@/database/history";
import { MainContext } from "@/pages/Main";
import { dayjs } from "@/utils/dayjs";
import { isBlank } from "@/utils/is";
import { getSaveImagePath, join } from "@/utils/path";
import { useTauriListen } from "./useTauriListen";

interface Options {
  scrollToTop: () => void;
}

export const useHistoryList = (options: Options) => {
  const { scrollToTop } = options;
  const { rootState } = useContext(MainContext);
  const state = useReactive({
    loading: false,
    noMore: false,
    page: 1,
    size: 20,
  });
  const fetchIdRef = useRef(0);

  const fetchData = async (isReload = false) => {
    if (!isReload && state.loading) return;

    const currentFetchId = ++fetchIdRef.current;

    try {
      state.loading = true;

      const { page } = state;

      const list = await selectHistory((qb) => {
        const { size } = state;
        const { group, search, dateRange, filterTags } = rootState;
        const isFavoriteGroup = group === "favorite";
        const isLinksGroup = group === "links";
        const isColorsGroup = group === "colors";
        const isEmailGroup = group === "email";
        const isCodeGroup = group === "code";
        const isNormalGroup =
          group !== "all" &&
          !isFavoriteGroup &&
          !isLinksGroup &&
          !isColorsGroup &&
          !isEmailGroup &&
          !isCodeGroup;

        return qb
          .$if(!!dateRange, (eb) => {
            return eb.where((eb) =>
              eb.or([
                eb.and([
                  eb(
                    "createTime",
                    ">=",
                    dayjs(dateRange![0]).format("YYYY-MM-DD HH:mm:ss"),
                  ),
                  eb(
                    "createTime",
                    "<=",
                    dayjs(dateRange![1]).format("YYYY-MM-DD HH:mm:ss"),
                  ),
                ]),
                eb.and([
                  eb("createTime", ">=", String(dateRange![0])),
                  eb("createTime", "<=", String(dateRange![1])),
                ]),
              ]),
            );
          })
          .$if(!!filterTags && filterTags.length < 12, (eb) => {
            return eb.where((eb) => {
              const conditions: any[] = [];
              if (filterTags!.includes("text"))
                conditions.push(
                  eb.and([eb("type", "=", "text"), eb("subtype", "is", null)]),
                );
              if (filterTags!.includes("rtf"))
                conditions.push(eb("type", "=", "rtf"));
              if (filterTags!.includes("html"))
                conditions.push(eb("type", "=", "html"));
              if (filterTags!.includes("image"))
                conditions.push(eb("type", "=", "image"));
              if (filterTags!.includes("url"))
                conditions.push(eb("subtype", "=", "url"));
              if (filterTags!.includes("code"))
                conditions.push(eb("subtype", "like", "code_%"));
              if (filterTags!.includes("markdown"))
                conditions.push(eb("subtype", "=", "markdown"));
              if (filterTags!.includes("path"))
                conditions.push(eb("subtype", "=", "path"));
              if (filterTags!.includes("email"))
                conditions.push(eb("subtype", "=", "email"));
              if (filterTags!.includes("color"))
                conditions.push(eb("subtype", "=", "color"));
              if (filterTags!.includes("command"))
                conditions.push(eb("subtype", "=", "command"));
              if (filterTags!.includes("files"))
                conditions.push(eb("type", "=", "files"));

              return eb.or(conditions);
            });
          })
          .$if(isFavoriteGroup, (eb) => eb.where("favorite", "=", true))
          .$if(isLinksGroup, (eb) => eb.where("subtype", "in", ["url", "path"]))
          .$if(isColorsGroup, (eb) => eb.where("subtype", "=", "color"))
          .$if(isEmailGroup, (eb) => eb.where("subtype", "=", "email"))
          .$if(isCodeGroup, (eb) => eb.where("subtype", "like", "code_%"))
          .$if(isNormalGroup, (eb) => eb.where("group", "=", group))
          .$if(!isBlank(search), (eb) => {
            return eb.where((eb) => {
              return eb.or([
                eb("search", "like", eb.val(`%${search}%`)),
                eb("note", "like", eb.val(`%${search}%`)),
              ]);
            });
          })
          .offset((page - 1) * size)
          .limit(size)
          .orderBy("createTime", "desc");
      });

      if (currentFetchId !== fetchIdRef.current) return;

      for (const item of list) {
        const { type, value } = item;

        if (!isString(value)) continue;

        if (type === "image") {
          const { getDefaultSaveImagePath } = await import(
            "tauri-plugin-clipboard-x-api"
          );
          const defaultPath = join(await getDefaultSaveImagePath(), value);
          const customPath = join(getSaveImagePath(), value);

          item.value = (await exists(customPath)) ? customPath : defaultPath;
        }

        if (type === "files") {
          item.value = JSON.parse(value);
        }
      }

      state.noMore = list.length === 0;

      if (page === 1) {
        rootState.list = list;

        if (state.noMore) return;

        return scrollToTop();
      }

      rootState.list = unionBy(rootState.list, list, "id");
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        state.loading = false;
      }
    }
  };

  const reload = () => {
    state.page = 1;
    state.noMore = false;

    return fetchData(true);
  };

  const loadMore = () => {
    if (state.noMore || state.loading) return;

    state.page += 1;

    fetchData(false);
  };

  useTauriListen(LISTEN_KEY.REFRESH_CLIPBOARD_LIST, reload);
  useTauriListen(LISTEN_KEY.TRANSFER_LIST_UPDATED, reload);

  useAsyncEffect(async () => {
    await reload();

    rootState.activeId = rootState.list[0]?.id;
  }, [
    rootState.group,
    rootState.search,
    rootState.dateRange,
    rootState.filterTags,
  ]);

  return {
    loadMore,
    reload,
  };
};
