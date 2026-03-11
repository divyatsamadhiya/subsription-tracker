"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { Subscription } from "@/lib/types";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { formatCurrencyMinor } from "@/lib/format";
import { buildCalendarGrid, buildRenewalMap, formatMonthLabel } from "@/lib/calendar-grid";

interface RenewalCalendarProps {
  renewals: Subscription[];
  today: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RenewalCalendar({ renewals, today }: RenewalCalendarProps) {
  const { days, todayDay, renewalMap, monthLabel } = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDow = new Date(y, m - 1, 1).getDay();
    const todayD = Number(today.split("-")[2]);

    return {
      days: buildCalendarGrid(daysInMonth, firstDow),
      todayDay: todayD,
      renewalMap: buildRenewalMap(renewals, y, m),
      monthLabel: formatMonthLabel(y, m),
    };
  }, [today, renewals]);

  return (
    <div>
      <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
        {monthLabel}
      </p>
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />;
          }

          const subs = renewalMap.get(day);
          const isToday = day === todayDay;
          const hasRenewal = subs && subs.length > 0;

          const cell = (
            <motion.div
              key={day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.008, duration: 0.2 }}
              className={`relative flex h-7 w-full items-center justify-center rounded-md text-xs transition-colors ${
                isToday
                  ? "bg-primary/15 font-semibold text-primary"
                  : hasRenewal
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {day}
              {hasRenewal && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </motion.div>
          );

          if (hasRenewal) {
            return (
              <Tooltip key={day}>
                <TooltipTrigger render={<span />}>{cell}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-48">
                  <div className="space-y-0.5">
                    {subs.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate">{s.name}</span>
                        <span className="shrink-0 font-medium">
                          {formatCurrencyMinor(s.amountMinor, s.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return cell;
        })}
      </div>
    </div>
  );
}
