"use client";

import { useEffect, useState } from "react";

import {
  getFeedbackShopper,
  type FeedbackShopper,
} from "@/lib/feedback/getFeedbackShopper";

type FeedbackShopperState =
  | { status: "IDLE" }
  | { status: "LOADING" }
  | FeedbackShopper;

export function useFeedbackShopper(
  enabled: boolean
): FeedbackShopperState {
  const [state, setState] = useState<FeedbackShopperState>({
    status: "IDLE",
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function loadShopper() {
      setState({ status: "LOADING" });

      const result = await getFeedbackShopper();

      if (!cancelled) {
        setState(result);
      }
    }

    void loadShopper();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}