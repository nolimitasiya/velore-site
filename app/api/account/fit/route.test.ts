import {
  FitMeasurementType,
  FitUnit,
  ShopperFitPreference,
} from "@prisma/client";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  requireAuthenticatedShopperMock,
  shopperFitProfileFindUniqueMock,
  transactionMock,
  shopperFitProfileUpsertMock,
  shopperFitMeasurementDeleteManyMock,
  shopperFitMeasurementUpsertMock,
} = vi.hoisted(() => ({
  requireAuthenticatedShopperMock: vi.fn(),
  shopperFitProfileFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  shopperFitProfileUpsertMock: vi.fn(),
  shopperFitMeasurementDeleteManyMock:
    vi.fn(),
  shopperFitMeasurementUpsertMock:
    vi.fn(),
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  requireAuthenticatedShopper:
    requireAuthenticatedShopperMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopperFitProfile: {
      findUnique:
        shopperFitProfileFindUniqueMock,
    },

    $transaction: transactionMock,
  },
}));

import { GET, PUT } from "./route";

const SHOPPER_ID =
  "00000000-0000-0000-0000-000000000001";

function makePutRequest(body: unknown) {
  return new Request(
    "http://localhost/api/account/fit",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

function makeGetRequest() {
  return new Request(
    "http://localhost/api/account/fit",
    {
      method: "GET",
    }
  );
}

describe("account Fit API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAuthenticatedShopperMock.mockResolvedValue({
      id: SHOPPER_ID,
    });

    shopperFitProfileUpsertMock.mockResolvedValue({
      id: "fit-profile-1",
    });

    shopperFitMeasurementDeleteManyMock.mockResolvedValue(
      {
        count: 0,
      }
    );

    shopperFitMeasurementUpsertMock.mockResolvedValue(
      {}
    );

    transactionMock.mockImplementation(
      async (
        callback: (tx: {
          shopperFitProfile: {
            upsert:
              typeof shopperFitProfileUpsertMock;
          };

          shopperFitMeasurement: {
            deleteMany:
              typeof shopperFitMeasurementDeleteManyMock;
            upsert:
              typeof shopperFitMeasurementUpsertMock;
          };
        }) => Promise<unknown>
      ) =>
        callback({
          shopperFitProfile: {
            upsert:
              shopperFitProfileUpsertMock,
          },

          shopperFitMeasurement: {
            deleteMany:
              shopperFitMeasurementDeleteManyMock,
            upsert:
              shopperFitMeasurementUpsertMock,
          },
        })
    );
  });

  it(
    "persists preferred skirt length separately from preferred maxi length in canonical centimetres",
    async () => {
      const response = await PUT(
        makePutRequest({
          preferredUnit: FitUnit.IN,
          fitPreference:
            ShopperFitPreference.REGULAR,

          hijabCoveragePreference: null,

          measurements: [
            {
              type:
                FitMeasurementType.GARMENT_LENGTH,
              value: 58,
            },
            {
              type:
                FitMeasurementType.SKIRT_LENGTH,
              value: 35.5,
            },
          ],
        }) as never
      );

      expect(response.status).toBe(200);

      expect(
        shopperFitMeasurementUpsertMock
      ).toHaveBeenCalledTimes(2);

      const calls =
        shopperFitMeasurementUpsertMock.mock.calls;

      const garmentLengthCall = calls.find(
        ([args]) =>
          args.create.type ===
          FitMeasurementType.GARMENT_LENGTH
      )?.[0];

      const skirtLengthCall = calls.find(
        ([args]) =>
          args.create.type ===
          FitMeasurementType.SKIRT_LENGTH
      )?.[0];

      expect(garmentLengthCall).toBeDefined();
      expect(skirtLengthCall).toBeDefined();

      expect(
        garmentLengthCall.create.valueCm.toString()
      ).toBe("147.32");

      expect(
        skirtLengthCall.create.valueCm.toString()
      ).toBe("90.17");

      expect(
        garmentLengthCall.create.type
      ).not.toBe(
        skirtLengthCall.create.type
      );

      const payload = await response.json();

      expect(payload).toEqual({
        ok: true,
        profileId: "fit-profile-1",
        measurementCount: 2,
      });
    }
  );

  it(
    "returns preferred skirt length separately from preferred maxi length",
    async () => {
      const createdAt = new Date(
        "2026-10-06T10:00:00.000Z"
      );

      const updatedAt = new Date(
        "2026-10-06T11:00:00.000Z"
      );

      shopperFitProfileFindUniqueMock.mockResolvedValue(
        {
          id: "fit-profile-1",
          preferredUnit: FitUnit.IN,
          fitPreference:
            ShopperFitPreference.REGULAR,
          hijabCoveragePreference: null,

          measurements: [
            {
              type:
                FitMeasurementType.GARMENT_LENGTH,
              valueCm: {
                toString: () => "147.32",
              },
            },
            {
              type:
                FitMeasurementType.SKIRT_LENGTH,
              valueCm: {
                toString: () => "90.17",
              },
            },
          ],

          createdAt,
          updatedAt,
        }
      );

      const response = await GET(
        makeGetRequest() as never
      );

      expect(response.status).toBe(200);

      const payload = await response.json();

      expect(payload.profile.measurements).toEqual([
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          valueCm: "147.32",
        },
        {
          type:
            FitMeasurementType.SKIRT_LENGTH,
          valueCm: "90.17",
        },
      ]);

      expect(
        payload.profile.measurements[1].type
      ).toBe(
        FitMeasurementType.SKIRT_LENGTH
      );

      expect(
        payload.profile.measurements[1].type
      ).not.toBe(
        FitMeasurementType.GARMENT_LENGTH
      );
    }
  );
});