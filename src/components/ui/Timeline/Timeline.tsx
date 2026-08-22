"use client";

import { Calendar, CheckCircle, Clock } from "lucide-react";

interface TimelineItem {
  title: string;
  description: string;
  time?: string;
  icon?: "calendar" | "check" | "clock";
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export default function Timeline({ items, className = "" }: TimelineProps) {
  const getIcon = (iconType: string = "check") => {
    switch (iconType) {
      case "calendar":
        return Calendar;
      case "clock":
        return Clock;
      default:
        return CheckCircle;
    }
  };

  return (
    <div className={`my-6 ml-4 ${className}`}>
      <div className="space-y-6 border-l-2 border-dashed border-[var(--accent)]">
        {items.map((item, index) => {
          const IconComponent = getIcon(item.icon);

          return (
            <div key={index} className="relative w-full">
              <IconComponent className="absolute -top-0.5 z-10 -ml-3.5 h-7 w-7 rounded-full bg-[var(--paper)] text-[var(--accent)]" />
              <div className="ml-8">
                <div className="font-bold text-[var(--accent)] text-base md:text-lg">
                  {item.title}
                </div>
                <p className="mt-2 text-sm md:text-base text-[var(--ink-body)] leading-relaxed">
                  {item.description}
                </p>
                {item.time && (
                  <span className="mt-2 inline-block rounded-card-inline bg-[var(--accent-fill)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
                    {item.time}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
