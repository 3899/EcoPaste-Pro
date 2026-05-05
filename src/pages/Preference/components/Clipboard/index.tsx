import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import ProList from "@/components/ProList";
import ProSwitch from "@/components/ProSwitch";
import { clipboardStore } from "@/stores/clipboard";
import AudioSettings from "./components/AudioSettings";
import AutoPaste from "./components/AutoPaste";
import CodeDisplayLines from "./components/CodeDisplayLines";
import DisplayLines from "./components/DisplayLines";
import FilesDisplayLines from "./components/FilesDisplayLines";
import ImageDisplayHeight from "./components/ImageDisplayHeight";
import OperationButton from "./components/OperationButton";
import SearchPosition from "./components/SearchPosition";
import WindowPosition from "./components/WindowPosition";

const ClipboardSettings = () => {
  const { window, search, content } = useSnapshot(clipboardStore);
  const { t } = useTranslation();

  return (
    <>
      <ProList header={t("preference.clipboard.window_settings.title")}>
        <WindowPosition />

        <ProSwitch
          description={t("preference.clipboard.window_settings.hints.back_top")}
          onChange={(value) => {
            clipboardStore.window.backTop = value;
          }}
          title={t("preference.clipboard.window_settings.label.back_top")}
          value={window.backTop}
        />

        <ProSwitch
          onChange={(value) => {
            clipboardStore.window.showAll = value;
          }}
          title={t("preference.clipboard.window_settings.label.show_all")}
          value={window.showAll}
        />
      </ProList>

      <AudioSettings />

      <ProList header={t("preference.clipboard.search_box_settings.title")}>
        <SearchPosition key={1} />

        <ProSwitch
          description={t(
            "preference.clipboard.search_box_settings.hints.default_focus",
          )}
          onChange={(value) => {
            clipboardStore.search.defaultFocus = value;
          }}
          title={t(
            "preference.clipboard.search_box_settings.label.default_focus",
          )}
          value={search.defaultFocus}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.search_box_settings.hints.auto_clear",
          )}
          onChange={(value) => {
            clipboardStore.search.autoClear = value;
          }}
          title={t("preference.clipboard.search_box_settings.label.auto_clear")}
          value={search.autoClear}
        />
      </ProList>

      <ProList header={t("preference.clipboard.content_settings.title")}>
        <AutoPaste />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.enable_text_selection",
          )}
          onChange={(value) => {
            clipboardStore.content.enableTextSelection = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.enable_text_selection",
          )}
          value={content.enableTextSelection}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.copy_as_plain",
          )}
          onChange={(value) => {
            clipboardStore.content.copyPlain = value;
          }}
          title={t("preference.clipboard.content_settings.label.copy_as_plain")}
          value={content.copyPlain}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.paste_as_plain",
          )}
          onChange={(value) => {
            clipboardStore.content.pastePlain = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.paste_as_plain",
          )}
          value={content.pastePlain}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.auto_favorite",
          )}
          onChange={(value) => {
            clipboardStore.content.autoFavorite = value;
          }}
          title={t("preference.clipboard.content_settings.label.auto_favorite")}
          value={content.autoFavorite}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.delete_confirm",
          )}
          onChange={(value) => {
            clipboardStore.content.deleteConfirm = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.delete_confirm",
          )}
          value={content.deleteConfirm}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.delete_skip_confirm_with_shift",
          )}
          onChange={(value) => {
            clipboardStore.content.deleteSkipConfirmWithShift = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.delete_skip_confirm_with_shift",
          )}
          value={content.deleteSkipConfirmWithShift}
        />
      </ProList>

      <ProList header={t("preference.clipboard.display_settings.title")}>
        <DisplayLines />

        <CodeDisplayLines />

        <FilesDisplayLines />

        <ImageDisplayHeight />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.enable_code_highlighting",
          )}
          onChange={(value) => {
            clipboardStore.content.enableCodeHighlighting = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.enable_code_highlighting",
          )}
          value={content.enableCodeHighlighting}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.record_source_app",
          )}
          onChange={(value) => {
            clipboardStore.content.recordSourceApp = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.record_source_app",
          )}
          value={content.recordSourceApp}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.display_settings.hints.default_collapse",
          )}
          onChange={(value) => {
            clipboardStore.content.defaultCollapse = value;
          }}
          title={t(
            "preference.clipboard.display_settings.label.default_collapse",
          )}
          value={content.defaultCollapse}
        />

        <OperationButton />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.auto_sort",
          )}
          onChange={(value) => {
            clipboardStore.content.autoSort = value;
          }}
          title={t("preference.clipboard.content_settings.label.auto_sort")}
          value={content.autoSort}
        />

        <ProSwitch
          description={t(
            "preference.clipboard.content_settings.hints.show_original_content",
          )}
          onChange={(value) => {
            clipboardStore.content.showOriginalContent = value;
          }}
          title={t(
            "preference.clipboard.content_settings.label.show_original_content",
          )}
          value={content.showOriginalContent}
        />
      </ProList>
    </>
  );
};

export default ClipboardSettings;
