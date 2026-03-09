import { useRef } from "react";
import { useTranslation } from "react-i18next";
import ProList from "@/components/ProList";
import { deleteHistory, selectHistory } from "@/database/history";
import { useImmediate } from "@/hooks/useImmediate";
import { clipboardStore } from "@/stores/clipboard";
import type { Interval } from "@/types/shared";
import { dayjs } from "@/utils/dayjs";
import Duration from "../../../History/components/Duration";
import MaxCount from "../../../History/components/MaxCount";
// import Delete from "../../../History/components/Delete";

const AutoClean = () => {
	const { t } = useTranslation();
	const timerRef = useRef<Interval>();

	useImmediate(clipboardStore.history, async () => {
		const { duration, maxCount } = clipboardStore.history;

		clearInterval(timerRef.current);

		if (duration === 0 && maxCount === 0) return;

		const delay = 1000 * 60 * 30;

		timerRef.current = setInterval(async () => {
			const list = await selectHistory((qb) => {
				return qb.where("favorite", "=", false);
			});

			for (const [index, item] of list.entries()) {
				const { createTime } = item;
				const diffDays = dayjs().diff(createTime, "days");
				const isExpired = duration > 0 && diffDays >= duration;
				const isOverMaxCount = maxCount > 0 && index >= maxCount;

				if (!isExpired && !isOverMaxCount) continue;

				deleteHistory(item);
			}
		}, delay);
	});

	return (
		<ProList
			header={t("preference.storage.auto_clean.title", "自动清理设置")}
		>
			<Duration />
			<MaxCount />
			{/* <Delete /> 已注释 */}
		</ProList>
	);
};

export default AutoClean;
