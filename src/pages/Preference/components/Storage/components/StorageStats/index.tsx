
import { emit } from "@tauri-apps/api/event";
import {
	Button,
	DatePicker,
	Flex,
	List,
	message,
	Modal,
	Select,
	Table,
	Divider,
	Checkbox,
	ConfigProvider,
	theme,
	Segmented,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { filesize } from "filesize";
import type { Key } from "react";
import { useCallback, 	useEffect,
	useMemo,
	useState,
} from "react";

const TYPE_WEIGHTS: Record<string, number> = {
	"text": 1,
	"html": 2,
	"image": 3,
	"url": 4,
	"path": 5,
	"color": 6,
	"rtf": 7,
	"markdown": 8,
	"code": 9,
	"email": 10,
	"command": 11,
	"files": 12,
};
import { useTranslation } from "react-i18next";
import ProList from "@/components/ProList";
import { CONTENT_TYPE_TAGS, getTypeDbCondition } from "@/constants/contentTypes";
import { LISTEN_KEY } from "@/constants";
import { getDatabase } from "@/database";
import { deleteHistory, selectHistory } from "@/database/history";
import { dayjs } from "@/utils/dayjs";


const { RangePicker } = DatePicker;

export interface TypeStat {
	count: number;
	color: string;
	icon: React.ReactNode;
	key: string;
	label: string;
	size: number;
}

type SortField = "type" | "count" | "size";
type SortOrder = "ascend" | "descend" | null;

type TimeRangeKey =
	| "all"
	| "today"
	| "yesterday"
	| "last_3_days"
	| "this_week"
	| "this_month"
	| "custom";

/**
 * 根据时间范围计算 DB 查询用的字符串范围
 * createTime 在 DB 中为 "YYYY-MM-DD HH:mm:ss" 格式文本
 * 直接返回同格式字符串用于 WHERE 比较
 */
const getDateRangeStrings = (
	timeRange: TimeRangeKey,
	customRange: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null],
): [string, string] | null => {
	const fmt = "YYYY-MM-DD HH:mm:ss";
	const now = dayjs();
	switch (timeRange) {
		case "all":
			return null;
		case "today":
			return [
				now.startOf("day").format(fmt),
				now.endOf("day").format(fmt),
			];
		case "yesterday": {
			const d = now.subtract(1, "day");
			return [d.startOf("day").format(fmt), d.endOf("day").format(fmt)];
		}
		case "last_3_days":
			return [
				now.subtract(2, "day").startOf("day").format(fmt),
				now.endOf("day").format(fmt),
			];
		case "this_week":
			// dayjs("zh-cn") 下 startOf("week") 为周一
			return [
				now.startOf("week").format(fmt),
				now.endOf("day").format(fmt),
			];
		case "this_month":
			return [
				now.startOf("month").format(fmt),
				now.endOf("day").format(fmt),
			];
		case "custom": {
			if (!customRange[0] || !customRange[1]) return null;
			const a = customRange[0];
			const b = customRange[1];
			const start = a.isBefore(b) ? a : b;
			const end = a.isBefore(b) ? b : a;
			return [
				start.startOf("day").format(fmt),
				end.endOf("day").format(fmt),
			];
		}
		default:
			return null;
	}
};

interface StorageStatsProps {
	refreshKey?: number;
}

const StorageStats = ({ refreshKey }: StorageStatsProps) => {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const [stats, setStats] = useState<TypeStat[]>([]);
	const [loading, setLoading] = useState(false);
	const [cleaning, setCleaning] = useState(false);

	const [sortField, setSortField] = useState<SortField>("type");
	const [sortOrder, setSortOrder] = useState<SortOrder>("ascend");

	const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
	const [timeRange, setTimeRange] = useState<TimeRangeKey>("all");
	const [scope, setScope] = useState<"all" | "favorites">("all");
	const [customRange, setCustomRange] = useState<
		[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null]
	>([null, null]);

	const fetchStats = useCallback(async (
		overrideTimeRange?: TimeRangeKey,
		overrideCustomRange?: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null],
		overrideScope?: "all" | "favorites",
	) => {
		const tr = overrideTimeRange ?? timeRange;
		const cr = overrideCustomRange ?? customRange;
		const sc = overrideScope ?? scope;
		setLoading(true);
		console.time("fetchStats_Total");
		try {
			console.time("db_init");
			const db = await getDatabase();
			console.timeEnd("db_init");

			const dateRange = getDateRangeStrings(tr, cr);

			// 极速优化: 1次 DB Query 获取所有 type, subtype 的分组 count 和 size 
			// （而不是12次循环下发SQL）
			console.time("db_group_query");
			const groupedRows = await db
				.selectFrom("history")
				.select([
					"type",
					"subtype",
					db.fn.count("id").as("count"),
					db.fn.sum("value_size").as("totalSize")
				])
				.$if(!!dateRange, (qb: any) =>
					qb.where((eb: any) =>
						eb.and([
							eb("createTime", ">=", dateRange![0]),
							eb("createTime", "<=", dateRange![1]),
						])
					)
				)
				.$if(sc === "favorites", (qb: any) =>
					qb.where("favorite", "=", true)
				)
				.groupBy(["type", "subtype"])
				.execute();
			console.timeEnd("db_group_query");

			console.time("aggregate_buckets");
			// 内存聚合到 12 个 buckets 中
			const tagBuckets: Record<string, { count: number; size: number }> = {};
			CONTENT_TYPE_TAGS.forEach((tag) => {
				tagBuckets[tag.key] = { count: 0, size: 0 };
			});

			for (const row of groupedRows) {
				const t = row.type as string;
				const st = row.subtype as string | null;
				let targetKey = "";

				if (st === "url") targetKey = "url";
				else if (st?.startsWith("code_")) targetKey = "code";
				else if (st === "markdown") targetKey = "markdown";
				else if (st === "path") targetKey = "path";
				else if (st === "email") targetKey = "email";
				else if (st === "color") targetKey = "color";
				else if (st === "command") targetKey = "command";
				else if (t === "text" && !st) targetKey = "text";
				else if (t === "rtf") targetKey = "rtf";
				else if (t === "html") targetKey = "html";
				else if (t === "image") targetKey = "image";
				else if (t === "files") targetKey = "files";

				if (targetKey && tagBuckets[targetKey]) {
					tagBuckets[targetKey].count += Number(row.count || 0);
					tagBuckets[targetKey].size += Number(row.totalSize || 0);
				}
			}
			console.timeEnd("aggregate_buckets");

			const results: TypeStat[] = CONTENT_TYPE_TAGS.map((tag) => ({
				key: tag.key,
				icon: tag.icon,
				color: tag.color,
				label: tag.label,
				count: tagBuckets[tag.key].count,
				size: tagBuckets[tag.key].size,
			}));

			results.sort((a, b) => {
				const wA = TYPE_WEIGHTS[a.key] || 999;
				const wB = TYPE_WEIGHTS[b.key] || 999;
				return wA - wB;
			});
			console.time("react_set_state");
			// 我们获取数据默认按 type 升序给到 stats (但实际呈现将走 sortedStats)
			setStats(results);
			console.timeEnd("react_set_state");
			// 将 fetchStats(value) 中顺便也重置排序状态
		} catch (error) {
			console.error("Failed to fetch storage stats:", error);
		} finally {
			console.timeEnd("fetchStats_Total");
			// 在 DOM 绘制大表前强制释放 loading 以便异步调度视觉
			setTimeout(() => {
				setLoading(false);
			}, 10);
		}
	}, [timeRange, customRange, scope]);

	// 每次切换到存储空间（refreshKey 变化）→ 重置时间范围为"全部"并刷新
	// 为了修复部分情况切换未刷新的问题，这里使用单独的 useEffect 直接监听 refreshKey
	useEffect(() => {
		if (refreshKey === undefined || refreshKey === 0) return;
		setTimeRange("all");
		setCustomRange([null, null]);
		setScope("all");
		setSelectedKeys([]);
		// 强制复位到“类型”正序
		setSortField("type");
		setSortOrder("ascend");
		fetchStats("all", [null, null], "all");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshKey]);

	useEffect(() => {
		// 初次挂载查询
		if (refreshKey === 0) {
			fetchStats("all", [null, null], "all");
		}
	}, []);

	const handleTimeRangeChange = (value: TimeRangeKey) => {
		setTimeRange(value);
		// 重置排序为默认：类型正序
		setSortField("type");
		setSortOrder("ascend");
		if (value !== "custom") {
			fetchStats(value);
		}
	};

	const handleCustomRangeChange = (
		dates: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null,
	) => {
		if (dates) {
			setCustomRange(dates);
			fetchStats("custom", dates);
		}
	};

	const handleScopeChange = (value: "all" | "favorites") => {
		setScope(value);
		setSelectedKeys([]);
		fetchStats(undefined, undefined, value);
	};

	const handleClean = async () => {
		if (selectedKeys.length === 0) return;

		const hasImage = selectedKeys.includes("image");
		let deleteLocalFile = true;

		const confirmed = await new Promise<boolean>((resolve) => {
			Modal.confirm({
				cancelText: t("preference.storage.storage_stats.button_cancel", "取消"),
				centered: true,
				content: (
					<Flex vertical gap={12}>
						<span>{scope === "favorites" ? t("preference.storage.storage_stats.clean_confirm_favorite", "确定要删除选中类型的所有已收藏记录吗？") : t("preference.storage.storage_stats.clean_confirm", "确定要删除选中类型的所有未收藏记录吗？")}</span>
						{hasImage && (
							<Checkbox
								defaultChecked={true}
								onChange={(e) => {
									deleteLocalFile = e.target.checked;
								}}
							>
								{t("preference.storage.storage_stats.clean_delete_local", "同时删除本地文件")}
							</Checkbox>
						)}
					</Flex>
				),
				okText: t("preference.storage.storage_stats.button_confirm_clean", "确定删除"),
				okButtonProps: { danger: true },
				onCancel: () => resolve(false),
				onOk: () => resolve(true),
			});
		});

		if (!confirmed) return;

		try {
			setCleaning(true);
			const dateRange = getDateRangeStrings(timeRange, customRange);

			for (const key of selectedKeys) {
				const tagKey = String(key);
				const items = await selectHistory((qb) => {
					let q = qb.where("favorite", "=", scope === "favorites");
					q = q.where((eb: any) => {
						const cond = getTypeDbCondition(tagKey, eb);
						return cond || eb("id", "is not", null);
					});
					if (dateRange) {
						q = q.where((eb) =>
							eb.and([
								eb("createTime", ">=", dateRange[0]),
								eb("createTime", "<=", dateRange[1]),
							]),
						);
					}
					return q;
				});

				for (const item of items) {
					await deleteHistory(item, deleteLocalFile);
				}
			}

			message.success(t("preference.storage.storage_stats.clean_success", "清理成功"));
			setSelectedKeys([]);
			emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
			await fetchStats();
		} catch (error) {
			message.error(String(error));
		} finally {
			setCleaning(false);
		}
	};

	const totalCount = stats.reduce((sum: number, s: TypeStat) => sum + s.count, 0);
	const totalSize = stats.reduce((sum: number, s: TypeStat) => sum + s.size, 0);

	// 计算全局联动排序结果
	// 注意：这里的排序会在 UI 线程直接阻断。如果 stats 有上万条，会构成性能负担（列表渲染缓慢）。
	// 针对“转圈加载2-3秒”优化：虽然 IPC stat 读取已提速，但在 `setStats` 导致 React 将两三万 DOM 节点挂载时
	// 长列表渲染往往会卡顿主线程。目前的条目级渲染是按类别（最高12项），应该不会卡DOM。
	// 后续排查可聚焦于渲染 List 之前的阻塞。
	const sortedStats = useMemo(() => {
		const result = [...stats];
		if (!sortField || !sortOrder) return result;

		result.sort((a, b) => {
			let diff = 0;
			if (sortField === "type") {
				// 扩展处理：为不在内置排序中的未来新增类型分配递增权重，确保按序追加在末尾
				let wA = TYPE_WEIGHTS[a.key];
				if (wA === undefined) {
					const extIndex = CONTENT_TYPE_TAGS.findIndex(t => t.key === a.key);
					wA = 999 + (extIndex >= 0 ? extIndex : 0);
				}
				let wB = TYPE_WEIGHTS[b.key];
				if (wB === undefined) {
					const extIndex = CONTENT_TYPE_TAGS.findIndex(t => t.key === b.key);
					wB = 999 + (extIndex >= 0 ? extIndex : 0);
				}
				diff = wA - wB;
			} else if (sortField === "count") {
				diff = a.count - b.count;
			} else if (sortField === "size") {
				diff = a.size - b.size;
			}
			return sortOrder === "ascend" ? diff : -diff;
		});
		return result;
	}, [stats, sortField, sortOrder]);

	// 长尾视觉平衡算法 (平滑空间映射法)
	const validStats = stats.filter((s) => s.size > 0);
	const maxSize = Math.max(...validStats.map((s) => s.size), 1);

	// 获取柱子渲染高度
	const getBarHeight = (size: number): number => {
		if (size === 0) return 3; // 空数据保底隐形高度 3px

		const minH = 4; // 最小可见高度
		const maxH = 110; // 最大可分配高度

		// f(x) = 保底高度 + (Max高度 - 保底高度) * sqrt(x / Max)
		return minH + (maxH - minH) * Math.sqrt(size / maxSize);
	};

	const columns: ColumnsType<TypeStat> = [
		{
			// 将 directions 限制为单向死循环，从源头避免 AntDesign 的 'null' 取消排序态
			sortDirections: ["ascend", "descend", "ascend"],
			// 将 dataIndex 指向 key，因为我们的 `sortField` 检测用的是 'type' (如果 dataIndex 也是 type 可以直接读 field，否则需要用 columnKey)
			dataIndex: "label",
			key: "type",
			title: t("preference.storage.storage_stats.col_type", "类型"),
			sorter: true,
			showSorterTooltip: false,
			sortOrder: sortField === "type" ? sortOrder : null,
			render: (_: any, record: TypeStat) => (
				<Flex align="center" gap={8}>
					<span
						className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold flex-shrink-0"
						style={{ color: record.color, backgroundColor: `${record.color}18` }}
					>
						{record.icon}
					</span>
					<span>{record.label}</span>
				</Flex>
			),
		},
		{
			sortDirections: ["descend", "ascend", "descend"],
			dataIndex: "count",
			key: "count",
			title: t("preference.storage.storage_stats.col_count", "数量"),
			align: "right" as const,
			className: "pr-6!",
			sorter: true,
			showSorterTooltip: false,
			sortOrder: sortField === "count" ? sortOrder : null,
		},
		{
			sortDirections: ["descend", "ascend", "descend"],
			dataIndex: "size",
			key: "size",
			title: t("preference.storage.storage_stats.col_size", "大小"),
			align: "right" as const,
			className: "pr-6!",
			sorter: true,
			showSorterTooltip: false,
			sortOrder: sortField === "size" ? sortOrder : null,
			render: (value: number) => (value > 0 ? (filesize(value) as string) : "0 B"),
		},
	];

	const timeRangeOptions = [
		{ value: "all" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.all", "全部") },
		{ value: "today" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.today", "今天") },
		{ value: "yesterday" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.yesterday", "昨天") },
		{ value: "last_3_days" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.last_3_days", "最近3天") },
		{ value: "this_week" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.this_week", "本周") },
		{ value: "this_month" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.this_month", "本月") },
		{ value: "custom" as TimeRangeKey, label: t("preference.storage.storage_stats.time_range_opt.custom", "自定义") },
	];

	// 分离数值和单位
	const totalSizeStr = totalSize > 0
		? (filesize(totalSize, { round: 2 }) as string)
		: "0 B";
	const sizeMatch = totalSizeStr.match(/^([\d.]+)\s*(.*)$/);
	const sizeNum = sizeMatch?.[1] || "0";
	const sizeUnit = sizeMatch?.[2] || "B";

	// 分离历史记录的标签
	const recordsLabel = t("preference.history.history.title", "历史记录");

	return (
		<ProList header={t("preference.storage.storage_stats.title", "存储统计")}>
			{/* 时间范围居左显示，自定义日期输入框跟在其后，分段控制器在最左侧 */}
			<List.Item style={{ borderBottom: "none", paddingBottom: 0 }}>
				<Flex justify="space-between" align="center" className="w-full">
					<Segmented<"all" | "favorites">
						options={[
							{ label: <div style={{ padding: '0 12px' }}>{t("preference.storage.storage_stats.scope_all", "全部")}</div>, value: "all" },
							{ label: <div style={{ padding: '0 12px' }}>{t("preference.storage.storage_stats.scope_favorite", "收藏")}</div>, value: "favorites" },
						]}
						value={scope}
						onChange={handleScopeChange}
						size="middle"
					/>
					<Flex align="center" gap={8}>
						<span className="text-sm">
							{t("preference.storage.storage_stats.time_range", "时间范围")}
						</span>
						<Select
							value={timeRange}
							onChange={handleTimeRangeChange}
							options={timeRangeOptions}
							style={{ width: 110 }}
						/>
						{timeRange === "custom" && (
							<RangePicker
								value={customRange}
								onChange={handleCustomRangeChange as any}
								style={{ width: 260 }}
							/>
						)}
					</Flex>
				</Flex>
			</List.Item>

			{/* 柱状图 + 已占用统计 (固定像素高度) */}
			<List.Item>
				<div
					className="w-full rounded-lg p-5"
					style={{ 
						background: "var(--ant-color-fill-quaternary)", 
					}}
				>
					<Flex gap={24} align="stretch" className="h-full">
						{/* 左侧: 已占用空间 + 历史记录数量 */}
						<Flex vertical justify="center" align="center" gap={32} className="flex-shrink-0" style={{ minWidth: 120 }}>
							<div className="text-center">
								<div className="text-xs text-color-3 mb-1">
									{t("preference.storage.storage_stats.used_space", "已占用空间")}
								</div>
								<div className="flex items-baseline justify-center gap-1">
									<span className="text-3xl font-bold leading-none">{sizeNum}</span>
									<span className="text-sm text-color-3 font-medium">{sizeUnit}</span>
								</div>
							</div>

							<div className="mt-2 text-center">
								<div className="text-xs text-color-3 mb-1">
									{recordsLabel}数量
								</div>
								<div className="flex items-baseline justify-center gap-1">
									<span className="text-3xl font-bold leading-none">{totalCount}</span>
									<span className="text-sm text-color-3 font-medium">条</span>
								</div>
							</div>
						</Flex>

						{/* 分割线 */}
						<div 
							className="h-[140px] my-auto w-px flex-shrink-0" 
							style={{ backgroundColor: "var(--ant-color-border-secondary)" }} 
						/>

						{/* 右侧: 柱状图 */}
						<div className="flex-1 min-w-0 flex flex-col justify-end">
							<Flex align="flex-end" gap={4} style={{ height: 160 }} justify="space-around">
								{sortedStats.map((item) => {
									const barH = getBarHeight(item.size);
									const nativeTitle = `${t("preference.storage.storage_stats.col_type", "类型")}: ${item.label}\n${t("preference.storage.storage_stats.col_count", "数量")}: ${item.count}\n${t("preference.storage.storage_stats.col_size", "大小")}: ${item.size > 0 ? (filesize(item.size) as string) : "0 B"}`;
									return (
										<Flex
											key={item.key}
											vertical
											align="center"
											justify="flex-end"
											className="flex-1 group cursor-pointer"
											style={{ height: "100%" }}
											title={nativeTitle}
										>
											<div
												className="w-full rounded-t transition-all duration-300 shadow-sm"
												style={{
													height: barH,
													backgroundColor: item.color,
													opacity: item.size > 0 ? 0.9 : 0.15,
												}}
											/>
											<Flex vertical align="center" className="mt-2 w-full">
												<span className="text-xs font-bold leading-none mb-1" style={{ color: item.color }}>
													{item.icon}
												</span>
												<span 
													className="text-[10px] text-color-3 truncate w-full text-center"
												>
													{item.label}
												</span>
											</Flex>
										</Flex>
									);
								})}
							</Flex>
						</div>
					</Flex>
				</div>
			</List.Item>

			{/* 统计明细表格 */}
			<style>{`
				/* 绝杀各种由于 Focus / Outline 带来的 “一闪而过的黑线” 及边框抖动现象 */
				.storage-stats-table .ant-table-thead > tr > th {
					outline: none !important;
					box-shadow: none !important;
					transition: background-color 0s !important; /* 禁用背景渐变，防止重绘时出现黑线锯齿闪烁 */
				}

				/* 强制保留 Antd 表头之间的分割竖线常驻（强化选择器权重以突破原生 hover/active 时的 transparent !important 隐藏） */
				.storage-stats-table.ant-table-wrapper .ant-table-thead > tr > th:not(:last-child)::before,
				.storage-stats-table.ant-table-wrapper .ant-table-thead > tr > th.ant-table-column-has-sorters:hover::before,
				.storage-stats-table.ant-table-wrapper .ant-table-thead > tr > th.ant-table-column-sort::before {
					display: block !important;
					background-color: var(--ant-color-border-secondary) !important;
				}
				
				/* 2. 隐藏未被激活（当前未生效）的非排序列箭头。仅悬停才隐约提示可排，或者彻底常态隐藏 */
				.storage-stats-table .ant-table-thead > tr > th:not(.ant-table-column-sort) .ant-table-column-sorter {
					opacity: 0;
					transition: opacity 0.2s;
				}
				/* 当鼠标悬停在尚未激活的列头上时，稍微透出箭头以供交互提示 */
				.storage-stats-table .ant-table-thead > tr > th:not(.ant-table-column-sort):hover .ant-table-column-sorter {
					opacity: 0.3;
				}
			`}</style>
			
			<ConfigProvider
				theme={{
					components: {
						Table: {
							// 通过官网 ConfigProvider 吸附全局的主题背景色：让激活列的背景=常规列背景！
							headerSortActiveBg: token.colorFillAlter,
							headerSortHoverBg: token.colorFillAlter,
							// bodySortBg 必须透明，以保证在“整行选中状态”时，那一格不会断掉选中色的底色
							bodySortBg: "transparent",
						},
					},
				}}
			>
				<Table<TypeStat>
				columns={columns}
				dataSource={sortedStats}
				loading={loading}
				pagination={false}
				onChange={(_pagination, _filters, sorter: any) => {
					// 解构获取当前点击的排序要求
					// sorter.columnKey 对应到 column 中设置的 key ("type" | "count" | "size")
					const key = sorter.columnKey;
					const order = sorter.order;

					if (order) {
						setSortField(key);
						setSortOrder(order);
					} else {
						// 取消了排序逻辑，也就是第三下点击，强制保持为之前的相反排序（禁止取消排序）
						// 从 sorter 中我们无法直接得知之前是 asc 还是 desc（因为它现在是 undefined），
						// 但如果组件处于取消态，意味着前一个状态必定是与初始首击相反的那个状态（比如 asc -> desc -> null）
						// 所以我们这里强制给它扭转回去即可。
						if (key === "type") {
							// 类型默认首击 asc -> 二击 desc -> 三击 null(此时转 asc)
							setSortField("type");
							setSortOrder("descend"); // 实际业务中要实现循环点击不中断有点麻烦，最简单的是在 Antd columns 声明 directions
						} else {
							setSortField(key);
							setSortOrder("ascend");
						}
					}
				}}
				rowKey="key"
				rowSelection={{
					selectedRowKeys: selectedKeys,
					onChange: (keys) => setSelectedKeys(keys),
				}}
				size="small"
				className="storage-stats-table"
			/>
			</ConfigProvider>

			{/* 按类型清理上方分割线 */}
			<Divider style={{ margin: 0, borderColor: "var(--ant-color-border-secondary)" }} />

			{/* 按类型清理 */}
			<List.Item>
				<Flex justify="space-between" align="center" className="w-full">
					<Flex align="center" gap={12}>
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
							style={{
								backgroundColor: "rgba(239,68,68,0.1)",
								border: "1px solid rgba(239,68,68,0.2)",
							}}
						>
							<svg className="w-5 h-5" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</div>
						<div>
							<div className="font-bold text-sm">
								{t("preference.storage.storage_stats.clean_by_type", "按类型清理")}
							</div>
							<div className="text-xs text-color-3 mt-0.5">
								{scope === "favorites" ? t("preference.storage.storage_stats.clean_hint_favorite", "选择类型标签批量清理 已收藏 的记录") : t("preference.storage.storage_stats.clean_hint", "选择类型标签批量清理 未收藏 的记录")}
							</div>
						</div>
					</Flex>
					<Button
						danger
						disabled={selectedKeys.length === 0}
						loading={cleaning}
						onClick={handleClean}
					>
						{t("preference.storage.storage_stats.clean_selected", "清理选中")} ({selectedKeys.length})
					</Button>
				</Flex>
			</List.Item>
		</ProList>
	);
};

export default StorageStats;
