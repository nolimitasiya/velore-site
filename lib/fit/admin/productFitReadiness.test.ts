import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assessProductFitReadiness,
  type ProductFitReadinessMeasurement,
} from "./productFitReadiness";

function measurement(
  type: FitMeasurementType,
  basis: FitMeasurementBasis,
  component: FitGarmentComponent =
    FitGarmentComponent.WHOLE_GARMENT
): ProductFitReadinessMeasurement {
  return {
    type,
    component,
    basis,
    minValueCm: 90,
    maxValueCm: 100,
  };
}

describe("assessProductFitReadiness", () => {
  it("marks a fully mapped Dress with required BODY evidence as READY", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.DRESS],
      catalogueSizeCount: 4,
      mappedSizeCount: 4,
      hasSufficientDesignedEaseEvidence: false,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
        measurement(
          FitMeasurementType.WAIST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
        measurement(
          FitMeasurementType.HIP,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
      ],
    });

    expect(result.status).toBe("READY");
    expect(result.reason).toBe(
      "BODY_EVIDENCE_COMPLETE"
    );
    expect(result.hasBodyEvidence).toBe(true);
    expect(result.missingBodyMeasurements).toEqual([]);
  });

  it("marks a fully mapped GARMENT-only Abaya without designed ease as CONDITIONAL", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.ABAYA],
      catalogueSizeCount: 3,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: false,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.GARMENT,
          FitGarmentComponent.ABAYA
        ),
        measurement(
          FitMeasurementType.WAIST,
          FitMeasurementBasis.GARMENT,
          FitGarmentComponent.ABAYA
        ),
      ],
    });

    expect(result.status).toBe("CONDITIONAL");
    expect(result.reason).toBe(
      "GARMENT_EVIDENCE_REQUIRES_EASE"
    );
    expect(result.hasBodyEvidence).toBe(false);
    expect(result.hasGarmentEvidence).toBe(true);

    expect(
      result.missingBodyMeasurements.map(
        (requirement) => requirement.type
      )
    ).toContain(FitMeasurementType.BUST);
  });

  it("marks BODY plus GARMENT evidence as ENHANCED", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.ABAYA],
      catalogueSizeCount: 3,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: false,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.ABAYA
        ),
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.GARMENT,
          FitGarmentComponent.ABAYA
        ),
      ],
    });

    expect(result.status).toBe("ENHANCED");
    expect(result.reason).toBe(
      "BODY_AND_GARMENT_EVIDENCE_COMPLETE"
    );
    expect(result.hasBodyEvidence).toBe(true);
    expect(result.hasGarmentEvidence).toBe(true);
  });

  it("accepts GARMENT evidence when sufficient designed-ease evidence exists without pretending BODY evidence exists", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.ABAYA],
      catalogueSizeCount: 3,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: true,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.GARMENT,
          FitGarmentComponent.ABAYA
        ),
      ],
    });

    expect(result.status).toBe("READY");
    expect(result.reason).toBe(
      "DESIGNED_EASE_EVIDENCE_COMPLETE"
    );

    expect(result.hasBodyEvidence).toBe(false);
    expect(result.hasGarmentEvidence).toBe(true);
  });

  it("fails closed when required BODY evidence is incomplete", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.DRESS],
      catalogueSizeCount: 4,
      mappedSizeCount: 4,
      hasSufficientDesignedEaseEvidence: false,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
        measurement(
          FitMeasurementType.WAIST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
      ],
    });

    expect(result.status).toBe("NOT_READY");
    expect(result.reason).toBe(
      "MISSING_REQUIRED_BODY_EVIDENCE"
    );

    expect(
      result.missingBodyMeasurements.map(
        (requirement) => requirement.type
      )
    ).toContain(FitMeasurementType.HIP);
  });

  it("fails closed when catalogue sizes are not fully mapped", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.DRESS],
      catalogueSizeCount: 4,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: false,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
        measurement(
          FitMeasurementType.WAIST,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
        measurement(
          FitMeasurementType.HIP,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.DRESS
        ),
      ],
    });

    expect(result.status).toBe("NOT_READY");
    expect(result.reason).toBe(
      "INCOMPLETE_SIZE_MAPPING"
    );
  });

  it("returns NOT_APPLICABLE for a product type that does not use conventional size recommendation", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.HIJAB],
      catalogueSizeCount: 1,
      mappedSizeCount: 1,
      hasSufficientDesignedEaseEvidence: false,
      measurements: [],
    });

    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.reason).toBe(
      "SIZE_RECOMMENDATION_NOT_SUPPORTED"
    );
  });

  it("fails closed when no canonical product type exists", () => {
    const result = assessProductFitReadiness({
      productTypes: [],
      catalogueSizeCount: 3,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: false,
      measurements: [],
    });

    expect(result.status).toBe("NOT_READY");
    expect(result.reason).toBe(
      "MISSING_PRODUCT_TYPE"
    );
  });

  it("fails closed when multiple canonical product types exist", () => {
    const result = assessProductFitReadiness({
      productTypes: [
        ProductType.DRESS,
        ProductType.ABAYA,
      ],
      catalogueSizeCount: 3,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: false,
      measurements: [],
    });

    expect(result.status).toBe("NOT_READY");
    expect(result.reason).toBe(
      "MULTIPLE_PRODUCT_TYPES"
    );
  });

  it("does not treat UNKNOWN-basis measurements as BODY or GARMENT evidence", () => {
    const result = assessProductFitReadiness({
      productTypes: [ProductType.ABAYA],
      catalogueSizeCount: 3,
      mappedSizeCount: 3,
      hasSufficientDesignedEaseEvidence: false,

      measurements: [
        measurement(
          FitMeasurementType.BUST,
          FitMeasurementBasis.UNKNOWN,
          FitGarmentComponent.ABAYA
        ),
      ],
    });

    expect(result.status).toBe("NOT_READY");
    expect(result.reason).toBe(
      "MISSING_REQUIRED_BODY_EVIDENCE"
    );
    expect(result.hasBodyEvidence).toBe(false);
    expect(result.hasGarmentEvidence).toBe(false);
  });
});