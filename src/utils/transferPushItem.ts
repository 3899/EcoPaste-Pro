import type { DatabaseSchemaHistory } from "@/types/database";
import { getSaveImagePath, join } from "@/utils/path";

type TransferPushItem = {
  value: string;
  type: string;
  subtype: string | null;
  search: string | null;
  source: string | null;
  isFromSync: boolean;
  local_path: string | null;
  display_name: string | null;
};

const inferImageDisplayName = (localPath: string | null) => {
  if (!localPath) return null;

  const parts = localPath.split(/[\\/]/);
  return parts[parts.length - 1] || null;
};

const resolveImageLocalPath = (
  data: Pick<DatabaseSchemaHistory, "type" | "value">,
  localPathOverride?: string | null,
) => {
  if (localPathOverride !== undefined) {
    return localPathOverride;
  }

  if (data.type !== "image" || typeof data.value !== "string") {
    return null;
  }

  const value = data.value.trim();
  if (!value) return null;

  const isAbsolutePath =
    /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\") || value.startsWith("/");

  return isAbsolutePath ? value : join(getSaveImagePath(), value);
};

export const buildTransferPushItem = (
  data: Pick<DatabaseSchemaHistory, "type" | "value" | "subtype" | "search" | "sourceAppName">,
  overrides?: {
    value?: string;
    localPath?: string | null;
    displayName?: string | null;
  },
): TransferPushItem => {
  const localPath =
    resolveImageLocalPath(data, overrides?.localPath);

  return {
    value:
      overrides?.value ??
      (typeof data.value === "string" ? data.value : JSON.stringify(data.value)),
    type: data.type,
    subtype: data.subtype || null,
    search: data.search || null,
    source: data.sourceAppName || null,
    isFromSync: false,
    local_path: localPath,
    display_name:
      overrides?.displayName !== undefined
        ? overrides.displayName
        : inferImageDisplayName(localPath),
  };
};
