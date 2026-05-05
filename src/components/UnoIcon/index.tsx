import {
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AudioOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LinkOutlined,
  LoadingOutlined,
  MailOutlined,
  MinusCircleOutlined,
  MonitorOutlined,
  PictureOutlined,
  PushpinOutlined,
  RightCircleOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from "@ant-design/icons";
import clsx from "clsx";
import type { ComponentType, FC, HTMLAttributes } from "react";

const iconMap: Record<string, ComponentType<any>> = {
  "i-hugeicons:task-edit-01": EditOutlined,
  "i-iconamoon:close-circle-1": CloseCircleOutlined,
  "i-iconamoon:star": StarOutlined,
  "i-iconamoon:star-fill": StarFilled,
  "i-iconamoon:volume-up-light": AudioOutlined,
  "i-lets-icons:pin": PushpinOutlined,
  "i-lets-icons:setting-alt-line": SettingOutlined,
  "i-lucide:activity": ClockCircleOutlined,
  "i-lucide:alert-circle": ExclamationCircleOutlined,
  "i-lucide:bell": BellOutlined,
  "i-lucide:bolt": ThunderboltOutlined,
  "i-lucide:check": CheckOutlined,
  "i-lucide:check-circle-2": CheckCircleOutlined,
  "i-lucide:chevron-down": DownOutlined,
  "i-lucide:chevron-up": UpOutlined,
  "i-lucide:circle-arrow-right": RightCircleOutlined,
  "i-lucide:circle-check": CheckCircleOutlined,
  "i-lucide:clipboard-list": FileTextOutlined,
  "i-lucide:clipboard-paste": CopyOutlined,
  "i-lucide:clipboard-pen-line": EditOutlined,
  "i-lucide:code": CodeOutlined,
  "i-lucide:copy": CopyOutlined,
  "i-lucide:database-backup": DatabaseOutlined,
  "i-lucide:download": DownloadOutlined,
  "i-lucide:edit": EditOutlined,
  "i-lucide:file-box": FileZipOutlined,
  "i-lucide:file-code-2": CodeOutlined,
  "i-lucide:file-json": FileTextOutlined,
  "i-lucide:filter": FilterOutlined,
  "i-lucide:folder-open": FolderOpenOutlined,
  "i-lucide:globe": GlobalOutlined,
  "i-lucide:grip-vertical": HolderOutlined,
  "i-lucide:hard-drive": DatabaseOutlined,
  "i-lucide:image": PictureOutlined,
  "i-lucide:info": InfoCircleOutlined,
  "i-lucide:keyboard": KeyOutlined,
  "i-lucide:layout-grid": AppstoreOutlined,
  "i-lucide:link": LinkOutlined,
  "i-lucide:loader-2": LoadingOutlined,
  "i-lucide:mail": MailOutlined,
  "i-lucide:minus-circle": MinusCircleOutlined,
  "i-lucide:monitor": MonitorOutlined,
  "i-lucide:network": ApiOutlined,
  "i-lucide:palette": FileImageOutlined,
  "i-lucide:refresh-cw": ClockCircleOutlined,
  "i-lucide:search": SearchOutlined,
  "i-lucide:send": SendOutlined,
  "i-lucide:shield-alert": AlertOutlined,
  "i-lucide:terminal": CodeOutlined,
  "i-lucide:trash": CloseOutlined,
  "i-lucide:triangle-alert": ExclamationCircleOutlined,
  "i-lucide:type": FontFallback,
  "i-lucide:upload-cloud": CloudUploadOutlined,
  "i-lucide:x": CloseOutlined,
};

function FontFallback(props: any) {
  return <span {...props}>T</span>;
}

export interface UnoIconProps extends HTMLAttributes<HTMLElement> {
  name?: string;
  size?: number;
  color?: string;
  active?: boolean;
  hoverable?: boolean;
}

const UnoIcon: FC<UnoIconProps> = (props) => {
  const { name, className, size, color, active, hoverable, style, ...rest } =
    props;
  const Icon = name ? iconMap[name] : undefined;
  const mergedClassName = clsx(className, "inline-flex", {
    "cursor-pointer transition hover:text-primary": hoverable,
    "text-primary": active,
  });
  const mergedStyle = {
    color,
    fontSize: size,
    height: size,
    width: size,
    ...style,
  };

  if (Icon) {
    return <Icon {...rest} className={mergedClassName} style={mergedStyle} />;
  }

  return (
    <i {...rest} className={clsx(name, mergedClassName)} style={mergedStyle} />
  );
};

export default UnoIcon;
