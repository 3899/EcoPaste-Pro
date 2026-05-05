import { FilterOutlined } from "@ant-design/icons";
import { DatePicker, Flex, Popover, Tabs } from "antd";
import type { Dayjs } from "dayjs";
import { useContext, useEffect, useState } from "react";
import { CONTENT_TYPE_TAGS } from "@/constants/contentTypes";
import { getDatabase } from "@/database";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import { dayjs } from "@/utils/dayjs";
import { MainContext } from "../..";

type FilterMode = "day" | "month" | "custom";

const DateFilter = () => {
  const { rootState } = useContext(MainContext);
  const [mode, setMode] = useState<FilterMode>("day");
  const [open, setOpen] = useState(false);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [dayDate, setDayDate] = useState<Dayjs | null>(null);
  const [monthDate, setMonthDate] = useState<Dayjs | null>(null);
  const [customDates, setCustomDates] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);

  const TAGS = CONTENT_TYPE_TAGS;

  useEffect(() => {
    if (open) {
      getDatabase().then((db) => {
        db.selectFrom("history")
          .select("createTime")
          .execute()
          .then((records) => {
            const dates = Array.from(
              new Set(records.map((r) => r.createTime.split(" ")[0])),
            );
            setActiveDates(dates);
          });
      });

      if (rootState.dateRange) {
        const [start] = rootState.dateRange;
        const current = dayjs(start);

        // determine the initial mode and set states based on what was selected
        // We know it's a day if the range is 1 full day exactly (startOf to endOf day)
        // We know it's a month if it's 1 full month exactly (startOf to endOf month)
        // Otherwise it's custom.
        const startDay = current.startOf("day").valueOf();
        const endDay = current.endOf("day").valueOf();
        const startMonth = current.startOf("month").valueOf();
        const endMonth = current.endOf("month").valueOf();

        const [rStart, rEnd] = rootState.dateRange;

        if (rStart === startDay && rEnd === endDay) {
          setMode("day");
          setDayDate(current);
        } else if (rStart === startMonth && rEnd === endMonth) {
          setMode("month");
          setMonthDate(current);
        } else {
          setMode("custom");
          setCustomDates([dayjs(rStart), dayjs(rEnd)]);
        }
      }
    }
  }, [open]);

  useTauriFocus({
    onBlur() {
      setOpen(false);
    },
  });

  const disabledDate = (current: Dayjs) => {
    const dateStr = current.format("YYYY-MM-DD");
    return !activeDates.includes(dateStr);
  };

  const disabledMonth = (current: Dayjs) => {
    const monthStr = current.format("YYYY-MM");
    return !activeDates.some((d) => d.startsWith(monthStr));
  };

  const handleClear = () => {
    rootState.dateRange = undefined;
    rootState.filterTags = undefined;
    setDayDate(null);
    setMonthDate(null);
    setCustomDates([null, null]);
    setOpen(false);
  };

  const toggleTag = (key: string) => {
    const currentTags = rootState.filterTags || TAGS.map((t) => t.key);
    if (currentTags.includes(key)) {
      rootState.filterTags = currentTags.filter((t) => t !== key);
    } else {
      rootState.filterTags = [...currentTags, key];
    }
  };

  const currentSelectedTags = rootState.filterTags || TAGS.map((t) => t.key);
  const isFilterActive =
    !!rootState.dateRange || currentSelectedTags.length < TAGS.length;

  const updateCustomRange = (dates: [Dayjs | null, Dayjs | null]) => {
    if (!dates[0] || !dates[1]) {
      rootState.dateRange = undefined;
    } else {
      const start = dates[0].isBefore(dates[1]) ? dates[0] : dates[1];
      const end = dates[0].isBefore(dates[1]) ? dates[1] : dates[0];
      rootState.dateRange = [
        start.startOf("day").valueOf(),
        end.endOf("day").valueOf(),
      ];
    }
  };

  const content = (
    <Flex className="w-64 select-none" gap={12} vertical>
      <div className="mb-[-8px] font-bold text-gray-700 text-sm">时间范围</div>
      <Tabs
        activeKey={mode}
        className="children:text-xs"
        items={[
          { key: "day", label: "按日" },
          { key: "month", label: "按月" },
          { key: "custom", label: "自定义" },
        ]}
        onChange={(key) => setMode(key as FilterMode)}
        size="small"
        tabBarStyle={{ marginBottom: 0 }}
      />

      <div className="mt-1">
        {mode === "day" && (
          <DatePicker
            className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
            disabledDate={disabledDate}
            onChange={(date: Dayjs | null) => {
              setDayDate(date);
              setMonthDate(null);
              setCustomDates([null, null]);
              if (!date) {
                rootState.dateRange = undefined;
              } else {
                rootState.dateRange = [
                  date.startOf("day").valueOf(),
                  date.endOf("day").valueOf(),
                ];
              }
            }}
            value={dayDate}
          />
        )}

        {mode === "month" && (
          <DatePicker
            className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
            disabledDate={disabledMonth}
            onChange={(date: Dayjs | null) => {
              setMonthDate(date);
              setDayDate(null);
              setCustomDates([null, null]);
              if (!date) {
                rootState.dateRange = undefined;
              } else {
                rootState.dateRange = [
                  date.startOf("month").valueOf(),
                  date.endOf("month").valueOf(),
                ];
              }
            }}
            picker="month"
            value={monthDate}
          />
        )}

        {mode === "custom" && (
          <Flex gap={8} vertical>
            <DatePicker
              className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
              onChange={(date) => {
                const newDates: [Dayjs | null, Dayjs | null] = [
                  date,
                  customDates[1],
                ];
                setCustomDates(newDates);
                setDayDate(null);
                setMonthDate(null);
                updateCustomRange(newDates);
              }}
              placeholder="开始日期"
              value={customDates[0]}
            />
            <DatePicker
              className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
              onChange={(date) => {
                const newDates: [Dayjs | null, Dayjs | null] = [
                  customDates[0],
                  date,
                ];
                setCustomDates(newDates);
                setDayDate(null);
                setMonthDate(null);
                updateCustomRange(newDates);
              }}
              placeholder="结束日期"
              value={customDates[1]}
            />
          </Flex>
        )}
      </div>

      <div className="mt-2">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <span className="font-bold text-gray-700 text-sm">内容类型</span>
            <span className="ml-1 font-normal text-gray-500 text-xs">
              (已选 {currentSelectedTags.length} 项)
            </span>
          </div>
          <span
            className="cursor-pointer text-primary text-xs transition-opacity hover:opacity-80"
            onClick={() => {
              if (currentSelectedTags.length === TAGS.length) {
                rootState.filterTags = [];
              } else {
                rootState.filterTags = TAGS.map((t) => t.key);
              }
            }}
          >
            {currentSelectedTags.length === TAGS.length ? "取消全选" : "全选"}
          </span>
        </div>
        <Flex gap={6} wrap="wrap">
          {TAGS.map((tag) => {
            const isActive = currentSelectedTags.includes(tag.key);
            return (
              <span
                className={`user-select-none cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                  isActive
                    ? "border-blue-50 bg-blue-50 text-primary"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
                key={tag.key}
                onClick={() => toggleTag(tag.key)}
              >
                {tag.label}
              </span>
            );
          })}
        </Flex>
      </div>

      <Flex className="mt-2 border-gray-100 border-t pt-3" justify="flex-end">
        <span
          className={`cursor-pointer text-sm transition-colors ${
            isFilterActive ? "text-red-500 hover:opacity-80" : "text-color-3"
          }`}
          onClick={handleClear}
        >
          清除条件
        </span>
      </Flex>
    </Flex>
  );

  return (
    <Popover
      content={content}
      onOpenChange={setOpen}
      open={open}
      placement="bottomRight"
      trigger="click"
    >
      <FilterOutlined
        className={`cursor-pointer text-[1.05rem] transition-colors hover:text-primary ${
          isFilterActive ? "text-primary" : ""
        }`}
        title="按日期和标签筛选"
      />
    </Popover>
  );
};

export default DateFilter;
