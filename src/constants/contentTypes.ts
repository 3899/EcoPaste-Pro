/**
 * 12 类内容类型标签定义
 * 统一供 DateFilter、StorageStats 等组件使用
 */
export interface ContentTypeTag {
	key: string;
	icon: string;
	color: string;
	label: string;
}

export const CONTENT_TYPE_TAGS: ContentTypeTag[] = [
	{ key: "text", icon: "T", color: "#3b82f6", label: "纯文本" },
	{ key: "rtf", icon: "≡", color: "#22c55e", label: "富文本" },
	{ key: "html", icon: "<>", color: "#f59e0b", label: "Html" },
	{ key: "image", icon: "🖼", color: "#ef4444", label: "图片" },
	{ key: "url", icon: "🔗", color: "#8b5cf6", label: "链接" },
	{ key: "path", icon: "📂", color: "#06b6d4", label: "路径" },
	{ key: "code", icon: "{}", color: "#ec4899", label: "代码" },
	{ key: "markdown", icon: "M↓", color: "#6366f1", label: "Markdown" },
	{ key: "email", icon: "✉", color: "#14b8a6", label: "邮箱" },
	{ key: "color", icon: "🎨", color: "#f97316", label: "颜色" },
	{ key: "command", icon: ">_", color: "#84cc16", label: "指令" },
	{ key: "files", icon: "📄", color: "#64748b", label: "文件(夹)" },
];

/**
 * 获取指定类型 key 的 Kysely 查询条件生成器
 * 与 useHistoryList.ts 中的过滤逻辑保持一致
 */
export const getTypeDbCondition = (
	key: string,
	eb: any,
): ReturnType<typeof eb.and> | ReturnType<typeof eb> | null => {
	switch (key) {
		case "text":
			return eb.and([eb("type", "=", "text"), eb("subtype", "is", null)]);
		case "rtf":
			return eb("type", "=", "rtf");
		case "html":
			return eb("type", "=", "html");
		case "image":
			return eb("type", "=", "image");
		case "url":
			return eb("subtype", "=", "url");
		case "path":
			return eb("subtype", "=", "path");
		case "code":
			return eb("subtype", "like", "code_%");
		case "markdown":
			return eb("subtype", "=", "markdown");
		case "email":
			return eb("subtype", "=", "email");
		case "color":
			return eb("subtype", "=", "color");
		case "command":
			return eb("subtype", "=", "command");
		case "files":
			return eb("type", "=", "files");
		default:
			return null;
	}
};
