import {
  FitGarmentComponent,
  FitMeasurementRangeType,
  FitMeasurementType,
  FitUnit,
} from "@prisma/client";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  requireAdminSessionMock,
  chartFindUniqueMock,
  transactionMock,
  entryFindManyMock,
  entryUpdateMock,
  entryCreateMock,
  entryDeleteManyMock,
  measurementDeleteManyMock,
  measurementCreateManyMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  chartFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  entryFindManyMock: vi.fn(),
  entryUpdateMock: vi.fn(),
  entryCreateMock: vi.fn(),
  entryDeleteManyMock: vi.fn(),
  measurementDeleteManyMock: vi.fn(),
  measurementCreateManyMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandSizeChart: {
      findUnique: chartFindUniqueMock,
    },

    $transaction: transactionMock,
  },
}));

import { PUT } from "./route";

function makeContext() {
  return {
    params: Promise.resolve({
      chartId: "chart-1",
    }),
  };
}

function makeRequest(
  rangeType: unknown,
  entryId: string | null = "entry-m"
) {
  return new Request(
    "http://localhost/api/admin/fit/size-charts/chart-1/entries",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entries: [
          {
            entryId,
            sizeLabel: "M",
            measurements: [
              {
                type: FitMeasurementType.BUST,
                component: FitGarmentComponent.JACKET,
                rangeType,
                minValue: "94",
                maxValue: "94",
              },
            ],
          },
        ],
      }),
    }
  );
}

describe(
  "PUT /api/admin/fit/size-charts/[chartId]/entries",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      requireAdminSessionMock.mockResolvedValue(
        undefined
      );

      chartFindUniqueMock.mockResolvedValue({
        id: "chart-1",
        sourceUnit: FitUnit.CM,
      });

      entryFindManyMock.mockResolvedValue([
        {
          id: "entry-m",
          sizeLabel: "M",
          productSizeMappings: [],
        },
      ]);

      transactionMock.mockImplementation(
        async (
          callback: (tx: {
            brandSizeChartEntry: {
              findMany: typeof entryFindManyMock;
              update: typeof entryUpdateMock;
              create: typeof entryCreateMock;
              deleteMany: typeof entryDeleteManyMock;
            };
            brandSizeChartMeasurement: {
              deleteMany:
                typeof measurementDeleteManyMock;
              createMany:
                typeof measurementCreateManyMock;
            };
          }) => unknown
        ) =>
          callback({
            brandSizeChartEntry: {
              findMany: entryFindManyMock,
              update: entryUpdateMock,
              create: entryCreateMock,
              deleteMany: entryDeleteManyMock,
            },

            brandSizeChartMeasurement: {
              deleteMany: measurementDeleteManyMock,
              createMany: measurementCreateManyMock,
            },
          })
      );
    });

    it(
      "accepts and persists UPPER_BOUND measurements",
      async () => {
        const response = await PUT(
          makeRequest(
            FitMeasurementRangeType.UPPER_BOUND
          ),
          makeContext()
        );

        expect(response.status).toBe(200);

        expect(
          measurementCreateManyMock
        ).toHaveBeenCalledTimes(1);

        const call =
          measurementCreateManyMock.mock.calls[0][0];

        expect(call.data).toHaveLength(1);

        expect(call.data[0]).toMatchObject({
          entryId: "entry-m",
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.JACKET,
          rangeType:
            FitMeasurementRangeType.UPPER_BOUND,
          sourceUnit: FitUnit.CM,
        });

        expect(
          call.data[0].sourceMinValue.toString()
        ).toBe("94");

        expect(
          call.data[0].sourceMaxValue.toString()
        ).toBe("94");

        expect(
          call.data[0].minValueCm.toString()
        ).toBe("94");

        expect(
          call.data[0].maxValueCm.toString()
        ).toBe("94");
      }
    );

    it(
      "accepts and persists RANGE measurements",
      async () => {
        const response = await PUT(
          makeRequest(
            FitMeasurementRangeType.RANGE
          ),
          makeContext()
        );

        expect(response.status).toBe(200);

        const call =
          measurementCreateManyMock.mock.calls[0][0];

        expect(call.data[0]).toMatchObject({
          rangeType: FitMeasurementRangeType.RANGE,
        });
      }
    );

    it(
      "rejects an invalid measurement range type",
      async () => {
        const response = await PUT(
          makeRequest("NOT_A_RANGE_TYPE"),
          makeContext()
        );

        expect(response.status).toBe(400);

        await expect(
          response.json()
        ).resolves.toEqual({
          ok: false,
          error:
            "Invalid measurement range type for BUST in size M.",
        });

        expect(
          transactionMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a missing measurement range type",
      async () => {
        const response = await PUT(
          makeRequest(undefined),
          makeContext()
        );

        expect(response.status).toBe(400);

        await expect(
          response.json()
        ).resolves.toEqual({
          ok: false,
          error:
            "Invalid measurement range type for BUST in size M.",
        });

        expect(
          transactionMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "persists rangeType when creating a new size entry",
      async () => {
        entryFindManyMock.mockResolvedValue([]);

        const response = await PUT(
          makeRequest(
            FitMeasurementRangeType.UPPER_BOUND,
            null
          ),
          makeContext()
        );

        expect(response.status).toBe(200);

        expect(entryCreateMock).toHaveBeenCalledWith({
          data: {
            chartId: "chart-1",
            sizeLabel: "M",
            sortOrder: 0,

            measurements: {
              create: [
                expect.objectContaining({
                  type: FitMeasurementType.BUST,
                  component:
                    FitGarmentComponent.JACKET,
                  rangeType:
                    FitMeasurementRangeType.UPPER_BOUND,
                  sourceUnit: FitUnit.CM,
                }),
              ],
            },
          },
        });
      }
    );
  }
);