"use client";

import { useEffect } from "react";

import {
  ensureAnalyticsSession,
} from "@/lib/analytics/clientSession";

export default function AnalyticsSessionBootstrap() {
  useEffect(() => {
    void ensureAnalyticsSession();
  }, []);

  return null;
}