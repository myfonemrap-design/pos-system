import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronDown } from "lucide-react";

export type DateFilterType =
  | "today"
  | "yesterday"
  | "last7Days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "custom"
  | "all";

export interface DateFilterValue {
  type: DateFilterType;
  startDate?: Date;
  endDate?: Date;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

const FILTERS: { value: DateFilterType; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7Days", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

function getDateRange(type: DateFilterType): {
  startDate: Date;
  endDate: Date;
} | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (type) {
    case "today":
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        startDate: yesterday,
        endDate: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }
    case "last7Days": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return {
        startDate: sevenDaysAgo,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }
    case "thisMonth":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ),
      };
    case "lastMonth": {
      const firstDayLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const lastDayLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      return {
        startDate: firstDayLastMonth,
        endDate: lastDayLastMonth,
      };
    }
    case "thisYear":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "lastYear": {
      const firstDayLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const lastDayLastYear = new Date(
        now.getFullYear() - 1,
        11,
        31,
        23,
        59,
        59,
        999
      );
      return {
        startDate: firstDayLastYear,
        endDate: lastDayLastYear,
      };
    }
    case "all":
      return null;
    default:
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
  }
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return start.toLocaleDateString("en-AU", opts);
  return `${start.toLocaleDateString("en-AU", opts)} - ${end.toLocaleDateString("en-AU", opts)}`;
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>(value.startDate);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(value.endDate);

  const handleFilterChange = (type: DateFilterType) => {
    if (type === "custom") {
      setShowCustom(true);
      onChange({
        type,
        startDate: tempStart || new Date(),
        endDate: tempEnd || new Date(),
      });
    } else {
      setShowCustom(false);
      const range = getDateRange(type);
      onChange({ type, ...range });
    }
  };

  const handleCustomApply = () => {
    if (tempStart && tempEnd) {
      onChange({ type: "custom", startDate: tempStart, endDate: tempEnd });
      setShowCustom(false);
    }
  };

  const handleCustomCancel = () => {
    setShowCustom(false);
  };

  const range =
    value.type !== "custom"
      ? getDateRange(value.type)
      : { startDate: value.startDate!, endDate: value.endDate! };

  const displayLabel =
    value.type === "custom" && value.startDate && value.endDate
      ? formatDateRange(value.startDate, value.endDate)
      : FILTERS.find(f => f.value === value.type)?.label || "Select";

  const isCustomActive = value.type === "custom";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="inline-flex items-center bg-[#f1f2f6] rounded-full p-1 gap-1 flex-wrap">
        {FILTERS.filter(f => f.value !== "custom").map(
          ({ value: filterValue, label }) => {
            const isActive = value.type === filterValue;
            return (
              <button
                key={filterValue}
                onClick={() => handleFilterChange(filterValue)}
                className={cn(
                  "relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "text-white shadow-sm z-10"
                    : "text-[#555577] hover:text-[#333355] hover:bg-[#e8e9f0]"
                )}
                style={isActive ? { background: "#7367f0" } : {}}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-[#7367f0]" />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          }
        )}
        <Popover open={showCustom} onOpenChange={setShowCustom}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap",
                isCustomActive
                  ? "text-white shadow-sm z-10"
                  : "text-[#555577] hover:text-[#333355] hover:bg-[#e8e9f0]"
              )}
              style={isCustomActive ? { background: "#7367f0" } : {}}
            >
              {isCustomActive && (
                <span className="absolute inset-0 rounded-full bg-[#7367f0]" />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <CalendarDays size={14} />
                {isCustomActive && displayLabel !== "Custom"
                  ? displayLabel
                  : "Custom"}
                <ChevronDown size={12} />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-col sm:flex-row">
                <div className="space-y-2 w-full sm:w-auto">
                  <label className="text-xs font-medium text-muted-foreground">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={
                      tempStart ? tempStart.toISOString().split("T")[0] : ""
                    }
                    onChange={e =>
                      setTempStart(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="w-full sm:w-[160px] h-10"
                  />
                </div>
                <div className="space-y-2 w-full sm:w-auto">
                  <label className="text-xs font-medium text-muted-foreground">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={tempEnd ? tempEnd.toISOString().split("T")[0] : ""}
                    onChange={e =>
                      setTempEnd(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="w-full sm:w-[160px] h-10"
                  />
                </div>
              </div>
              <Calendar
                mode="range"
                selected={{ from: tempStart, to: tempEnd }}
                onSelect={range => {
                  setTempStart(range?.from);
                  setTempEnd(range?.to);
                }}
                numberOfMonths={2}
                className="rounded-md border"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomCancel}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCustomApply}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {value.type !== "custom" && value.type !== "all" && range && (
        <span className="text-sm text-[#555577] ml-2">
          {formatDateRange(range.startDate, range.endDate)}
        </span>
      )}
    </div>
  );
}

export function filterByDateRange<T extends { createdAt: string }>(
  items: T[],
  filter: DateFilterValue
): T[] {
  const { type, startDate, endDate } = filter;

  function parseLocalDate(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours = "0", minutes = "0", seconds = "0"] = (
      timePart?.split(".")[0] || "00:00:00"
    ).split(":");
    return new Date(
      year,
      month - 1,
      day,
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
  }

  if (type === "all") {
    return items;
  }

  if (type === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return items.filter(item => {
      const date = parseLocalDate(item.createdAt);
      return date >= start && date <= end;
    });
  }

  const range = getDateRange(type);
  if (!range) return items;
  return items.filter(item => {
    const date = parseLocalDate(item.createdAt);
    return date >= range.startDate && date <= range.endDate;
  });
}
