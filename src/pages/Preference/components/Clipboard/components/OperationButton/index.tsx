import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  HolderOutlined,
  PictureOutlined,
  SendOutlined,
  SnippetsOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoolean, useCreation } from "ahooks";
import { Button, Checkbox, Flex, Modal, Transfer } from "antd";
import type { TransferCustomListBodyProps } from "antd/lib/transfer/list";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import ProListItem from "@/components/ProListItem";
import { clipboardStore } from "@/stores/clipboard";
import { transferStore } from "@/stores/transfer";
import type { OperationButton as Key } from "@/types/store";

interface TransferData {
  key: Key;
  title: string;
  Icon: ComponentType<{ className?: string; title?: string }>;
  ActiveIcon?: ComponentType<{ className?: string; title?: string }>;
}

export const transferData: TransferData[] = [
  {
    Icon: CopyOutlined,
    key: "copy",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.copy",
  },
  {
    Icon: SnippetsOutlined,
    key: "pastePlain",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.paste_plain",
  },
  {
    Icon: FileTextOutlined,
    key: "note",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.notes",
  },
  {
    ActiveIcon: StarFilled,
    Icon: StarOutlined,
    key: "star",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.favorite",
  },
  {
    Icon: DeleteOutlined,
    key: "delete",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.delete",
  },
  {
    Icon: GlobalOutlined,
    key: "openBrowser",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.open_browser",
  },
  {
    Icon: PictureOutlined,
    key: "previewImage",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.preview_image",
  },
  {
    Icon: EditOutlined,
    key: "edit",
    title: "clipboard.button.context_menu.edit",
  },
  {
    Icon: FolderOpenOutlined,
    key: "openFolder",
    title: "clipboard.button.context_menu.show_in_file_explorer",
  },
  {
    Icon: CodeOutlined,
    key: "runCommand",
    title: "clipboard.button.context_menu.run_command",
  },
  {
    Icon: SendOutlined,
    key: "push",
    title:
      "preference.clipboard.content_settings.label.operation_button_option.push",
  },
];

interface SortableItemProps {
  item: TransferData;
  onItemSelect: (key: string, selected: boolean) => void;
  renderTransferData: (data: TransferData) => React.ReactNode;
  selectedKeys: React.Key[];
}

const SortableItem = ({
  item,
  selectedKeys,
  onItemSelect,
  renderTransferData,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    position: "relative" as const,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <Flex
      align="center"
      className={
        isDragging
          ? "bg-color-4 shadow-sm"
          : "cursor-grab outline-none hover:bg-color-4"
      }
      gap={8}
      ref={setNodeRef}
      style={{
        borderRadius: 6,
        padding: "4px 8px",
        touchAction: "none",
        ...style,
      }}
      {...attributes}
      {...listeners}
    >
      <HolderOutlined className="cursor-grab text-color-3 text-sm" />
      <div
        className="ant-tree-checkbox ant-checkbox-wrapper m-r-1 flex-shrink-0 cursor-pointer"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selectedKeys.includes(item.key)}
          onChange={(e) => onItemSelect(item.key, e.target.checked)}
        />
      </div>
      {renderTransferData(item)}
    </Flex>
  );
};

const OperationButton = () => {
  const { content } = useSnapshot(clipboardStore);
  const [open, { toggle }] = useBoolean();
  const { t } = useTranslation();

  const treeData = useCreation(() => {
    return content.operationButtons.map((key) => {
      return transferData.find((data) => data.key === key)!;
    });
  }, [content.operationButtons]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = content.operationButtons.findIndex(
        (key) => key === active.id,
      );
      const newIndex = content.operationButtons.findIndex(
        (key) => key === over.id,
      );

      const newButtons = arrayMove(
        content.operationButtons,
        oldIndex,
        newIndex,
      );
      clipboardStore.content.operationButtons = newButtons as Key[];
    }
  };

  const renderTransferData = (data: TransferData) => {
    const { key, Icon, title } = data;

    return (
      <Flex align="center" className="max-w-31.25 flex-1" gap={4} key={key}>
        <Icon />
        <span className="truncate">{t(title)}</span>
      </Flex>
    );
  };

  const renderTree = (data: TransferCustomListBodyProps<TransferData>) => {
    const { direction, selectedKeys, onItemSelect } = data;

    if (direction === "right" && content.operationButtons?.length) {
      return (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <div className="flex flex-col gap-1 p-1">
            <SortableContext
              items={treeData.map((item) => item.key)}
              strategy={verticalListSortingStrategy}
            >
              {treeData.map((item) => (
                <SortableItem
                  item={item}
                  key={item.key}
                  onItemSelect={onItemSelect}
                  renderTransferData={renderTransferData}
                  selectedKeys={selectedKeys}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      );
    }
  };

  return (
    <>
      <ProListItem
        description={t(
          "preference.clipboard.content_settings.hints.operation_button",
        )}
        title={t(
          "preference.clipboard.content_settings.label.operation_button",
        )}
      >
        <Button onClick={toggle}>
          {t(
            "preference.clipboard.content_settings.button.custom_operation_button",
          )}
        </Button>
      </ProListItem>

      <Modal
        centered
        destroyOnClose
        footer={null}
        onCancel={toggle}
        open={open}
        title={t(
          "preference.clipboard.content_settings.label.custom_operation_button_title",
        )}
        width={520}
      >
        <Transfer
          dataSource={transferData.filter(
            (d) => d.key !== "push" || transferStore.push.masterEnabled,
          )}
          onChange={(keys) => {
            clipboardStore.content.operationButtons = keys as any[];
          }}
          render={renderTransferData}
          targetKeys={content.operationButtons as any[]}
        >
          {renderTree}
        </Transfer>
      </Modal>
    </>
  );
};

export default OperationButton;
