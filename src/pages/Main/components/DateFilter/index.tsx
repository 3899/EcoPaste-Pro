import { DatePicker, Flex, Popover, Tabs } from "antd";
import type { Dayjs } from "dayjs";
import { dayjs } from "@/utils/dayjs";
import { useContext, useEffect, useState } from "react";
import UnoIcon from "@/components/UnoIcon";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import { getDatabase } from "@/database";
import { CONTENT_TYPE_TAGS } from "@/constants/contentTypes";
import { MainContext } from "../..";

type FilterMode = "day" | "month" | "custom";

const DateFilter = () => {
  const { rootState } = useContext(MainContext);
  const [mode, setMode] = useState<FilterMode>("day");
  const [open, setOpen] = useState(false);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [dayDate, setDayDate] = useState<Dayjs | null>(null);
  const [monthDate, setMonthDate] = useState<Dayjs | null>(null);
  const [customDates, setCustomDates] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const TAGS = CONTENT_TYPE_TAGS;

  useEffect(() => {
    if (open) {
      getDatabase().then((db) => {
        db.selectFrom("history")
          .select("createTime")
          .execute()
          .then((records) => {
            const dates = Array.from(
              new Set(records.map((r) => r.createTime.split(" ")[0]))
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
    const currentTags = rootState.filterTags || TAGS.map(t => t.key);
    if (currentTags.includes(key)) {
      rootState.filterTags = currentTags.filter(t => t !== key);
    } else {
      rootState.filterTags = [...currentTags, key];
    }
  };

  const currentSelectedTags = rootState.filterTags || TAGS.map(t => t.key);
  const isFilterActive = !!rootState.dateRange || currentSelectedTags.length < TAGS.length;

  const updateCustomRange = (dates: [Dayjs | null, Dayjs | null]) => {
    if (!dates[0] || !dates[1]) {
      rootState.dateRange = undefined;
    } else {
      const start = dates[0].isBefore(dates[1]) ? dates[0] : dates[1];
      const end = dates[0].isBefore(dates[1]) ? dates[1] : dates[0];
      rootState.dateRange = [start.startOf("day").valueOf(), end.endOf("day").valueOf()];
    }
  };

  const content = (
    <Flex vertical gap={12} className="w-64 select-none">
      <div className="text-sm text-gray-700 font-bold mb-[-8px]">时间范围</div>
      <Tabs
        activeKey={mode}
        onChange={(key) => setMode(key as FilterMode)}
        items={[
          { key: "day", label: "按日" },
          { key: "month", label: "按月" },
          { key: "custom", label: "自定义" },
        ]}
        size="small"
        tabBarStyle={{ marginBottom: 0 }}
        className="children:text-xs"
      />
      
      <div className="mt-1">
      {mode === "day" && (
        <DatePicker
          className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
          value={dayDate}
          disabledDate={disabledDate}
          onChange={(date: Dayjs | null) => {
            setDayDate(date);
            setMonthDate(null);
            setCustomDates([null, null]);
            if (!date) {
              rootState.dateRange = undefined;
            } else {
              rootState.dateRange = [date.startOf("day").valueOf(), date.endOf("day").valueOf()];
            }
          }}
        />
      )}

      {mode === "month" && (
        <DatePicker
          picker="month"
          className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
          value={monthDate}
          disabledDate={disabledMonth}
          onChange={(date: Dayjs | null) => {
            setMonthDate(date);
            setDayDate(null);
            setCustomDates([null, null]);
            if (!date) {
              rootState.dateRange = undefined;
            } else {
              rootState.dateRange = [date.startOf("month").valueOf(), date.endOf("month").valueOf()];
            }
          }}
        />
      )}

      {mode === "custom" && (
        <Flex vertical gap={8}>
          <DatePicker
            className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
            placeholder="开始日期"
            value={customDates[0]}
            onChange={(date) => {
              const newDates: [Dayjs | null, Dayjs | null] = [date, customDates[1]];
              setCustomDates(newDates);
              setDayDate(null);
              setMonthDate(null);
              updateCustomRange(newDates);
            }}
          />
          <DatePicker
            className="w-full text-xs [&_.ant-picker-input_input]:text-xs"
            placeholder="结束日期"
            value={customDates[1]}
            onChange={(date) => {
              const newDates: [Dayjs | null, Dayjs | null] = [customDates[0], date];
              setCustomDates(newDates);
              setDayDate(null);
              setMonthDate(null);
              updateCustomRange(newDates);
            }}
          />
        </Flex>
      )}
      </div>

      <div className="mt-2">
        <div className="mb-2 flex justify-between items-center">
          <div>
            <span className="text-sm font-bold text-gray-700">内容类型</span>
            <span className="text-xs text-gray-500 font-normal ml-1">(已选 {currentSelectedTags.length} 项)</span>
          </div>
          <span 
            className="cursor-pointer text-xs text-primary hover:opacity-80 transition-opacity"
            onClick={() => {
              if (currentSelectedTags.length === TAGS.length) {
                rootState.filterTags = [];
              } else {
                rootState.filterTags = TAGS.map(t => t.key);
              }
            }}
          >
            {currentSelectedTags.length === TAGS.length ? "取消全选" : "全选"}
          </span>
        </div>
        <Flex wrap="wrap" gap={6}>
          {TAGS.map(tag => {
            const isActive = currentSelectedTags.includes(tag.key);
            return (
              <span
                key={tag.key}
                onClick={() => toggleTag(tag.key)}
                className={`px-3 py-1 rounded-full text-xs cursor-pointer user-select-none transition-colors border ${
                  isActive 
                    ? 'text-primary bg-blue-50 border-blue-50' 
                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tag.label}
              </span>
            );
          })}
        </Flex>
      </div>

      <Flex justify="flex-end" className="mt-2 pt-3 border-t border-gray-100">
        <span
          className={`cursor-pointer text-sm transition-colors ${
            isFilterActive ? 'text-red-500 hover:opacity-80' : 'text-color-3'
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
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <UnoIcon
        className="cursor-pointer transition-colors hover:text-primary text-[1.05rem]"
        active={isFilterActive}
        hoverable
        name="i-lucide:filter"
        title="按日期和标签筛选"
      />
    </Popover>
  );
};

export default DateFilter;
