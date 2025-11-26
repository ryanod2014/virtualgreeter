"use client";

import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DayPicker, DateRange } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onRangeChange: (from: Date, to: Date) => void;
}

const presets = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function DateRangePicker({
  from,
  to,
  onRangeChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfDay(from),
    to: startOfDay(to),
  });

  // Sync external changes
  useEffect(() => {
    setRange({
      from: startOfDay(from),
      to: startOfDay(to),
    });
  }, [from, to]);

  const handlePreset = (days: number) => {
    const toDate = new Date();
    const fromDate = days === 0 ? new Date() : subDays(toDate, days);
    setRange({ from: startOfDay(fromDate), to: startOfDay(toDate) });
    onRangeChange(startOfDay(fromDate), endOfDay(toDate));
    setIsOpen(false);
  };

  const handleApply = () => {
    if (range?.from && range?.to) {
      onRangeChange(startOfDay(range.from), endOfDay(range.to));
      setIsOpen(false);
    }
  };

  // Check which preset is currently active
  const getActivePreset = () => {
    if (!range?.from || !range?.to) return null;
    const today = startOfDay(new Date());
    const rangeFrom = startOfDay(range.from);
    const rangeTo = startOfDay(range.to);

    for (const preset of presets) {
      const presetFrom =
        preset.days === 0 ? today : startOfDay(subDays(today, preset.days));
      if (
        rangeFrom.getTime() === presetFrom.getTime() &&
        rangeTo.getTime() === today.getTime()
      ) {
        return preset.days;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  const formatDateRange = () => {
    if (!range?.from) return "Select dates";
    if (!range?.to) return format(range.from, "MMM d, yyyy");
    return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formatDateRange()}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-2xl shadow-2xl p-0 animate-in fade-in-0 zoom-in-95 border border-border bg-white dark:bg-zinc-900"
          sideOffset={8}
          align="start"
        >
          <div className="flex">
            {/* Presets Sidebar */}
            <div className="w-40 border-r border-border p-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                Quick Select
              </div>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.days)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activePreset === preset.days
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-4">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                showOutsideDays={false}
                disabled={{ after: new Date() }}
                classNames={{
                  months: "flex gap-4",
                  month: "space-y-3",
                  caption: "flex justify-center relative items-center h-10",
                  caption_label: "text-sm font-semibold",
                  nav: "flex items-center gap-1",
                  nav_button:
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell:
                    "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                  row: "flex w-full mt-1",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-lg transition-colors inline-flex items-center justify-center",
                  day_range_start:
                    "day-range-start bg-primary text-primary-foreground hover:bg-primary",
                  day_range_end:
                    "day-range-end bg-primary text-primary-foreground hover:bg-primary",
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary focus:bg-primary",
                  day_today: "bg-muted font-bold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle:
                    "aria-selected:bg-primary/10 aria-selected:text-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                  IconRight: () => <ChevronRight className="h-4 w-4" />,
                }}
              />

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  {range?.from && range?.to && (
                    <span>
                      {Math.ceil(
                        (range.to.getTime() - range.from.getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1}{" "}
                      days selected
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!range?.from || !range?.to}
                    className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Popover.Arrow className="fill-white dark:fill-zinc-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

