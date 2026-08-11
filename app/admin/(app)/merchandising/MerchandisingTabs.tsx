"use client";

import { useState } from "react";

import CategoryMerchandisingClient from "./CategoryMerchandisingClient";
import CompleteTheLookClient from "./CompleteTheLookClient";

type ProductTypeOption = {
  value: string;
  label: string;
};

type OccasionOption = {
  id: string;
  name: string;
  slug: string;
};

export default function MerchandisingTabs({
  productTypes,
  occasions,
}: {
  productTypes: ProductTypeOption[];
  occasions: OccasionOption[];
}) {
  const [tab, setTab] = useState<
    "CATEGORY" | "LOOK"
  >("CATEGORY");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
        <button
          type="button"
          onClick={() =>
            setTab("CATEGORY")
          }
          className={[
            "rounded-full px-5 py-2.5 text-sm transition",
            tab === "CATEGORY"
              ? "bg-[#7B2D3E] text-white"
              : "text-black/60 hover:text-black",
          ].join(" ")}
        >
          Category curation
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("LOOK")
          }
          className={[
            "rounded-full px-5 py-2.5 text-sm transition",
            tab === "LOOK"
              ? "bg-[#7B2D3E] text-white"
              : "text-black/60 hover:text-black",
          ].join(" ")}
        >
          Complete the Look
        </button>
      </div>

      {tab === "CATEGORY" ? (
        <CategoryMerchandisingClient
          productTypes={productTypes}
          occasions={occasions}
        />
      ) : (
        <CompleteTheLookClient />
      )}
    </div>
  );
}