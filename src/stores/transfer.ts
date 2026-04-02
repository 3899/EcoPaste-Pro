import { proxy } from "valtio";
import type { TransferStore } from "@/types/store";
import { CONTENT_TYPE_TAGS } from "@/constants/contentTypes";

export const transferStore = proxy<TransferStore>({
  push: {
    masterEnabled: false,
    autoPushMode: "off",
    autoPushTags: CONTENT_TYPE_TAGS.map((tag) => tag.key),
    provider: "bark",
    barkEnabled: true,
    webhookEnabled: false,
    // Bark 非敏感配置
    barkAutoCopy: true,
    barkArchive: false,
    barkLevel: "active",
    barkGroupMode: "disabled",
    barkGroupMapping: Object.fromEntries(
      CONTENT_TYPE_TAGS.map((tag) => [tag.key, tag.label])
    ),
    imageStrategy: "reject",
    imageTtlSeconds: 180,
    imageLocalDirectory: "",
    // Webhook 非敏感配置
    webhookPayloadTemplate:
      '{\n  "msg_type": "text",\n  "content": {\n    "text": "{{剪贴板内容}}"\n  }\n}',
  },
  receive: {
    masterEnabled: false,
    port: 41234,
    autoCopy: true,
  },
});
