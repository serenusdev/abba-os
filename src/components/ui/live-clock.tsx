"use client";

import * as React from "react";

interface LiveClockProps {
  format?: "time-only" | "time-seconds" | "full";
  className?: string;
  suffix?: string;
}

export function LiveClock({
  format = "time-only",
  className = "",
  suffix = "",
}: LiveClockProps) {
  const [timeStr, setTimeStr] = React.useState<string>("");

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      if (format === "time-seconds") {
        setTimeStr(
          now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Jakarta",
          })
        );
      } else if (format === "full") {
        setTimeStr(
          now.toLocaleTimeString("id-ID", {
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          })
        );
      } else {
        setTimeStr(
          now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          })
        );
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [format]);

  if (!timeStr) {
    return <span className={className}>--:--{suffix ? ` ${suffix}` : ""}</span>;
  }

  return (
    <span className={className}>
      {timeStr}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

