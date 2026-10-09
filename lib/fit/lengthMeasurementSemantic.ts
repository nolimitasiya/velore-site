export type LengthMeasurementSemantic = {
  shopperLabel: string;
  garmentLabel: string;
  shopperReferencePhrase: string;
  matchPhrase: string;
};

export function getLengthMeasurementSemantic(
  measurementType: string
): LengthMeasurementSemantic {
  switch (measurementType) {
    case "INSEAM":
      return {
        shopperLabel: "Your inseam",
        garmentLabel: "Inseam",
        shopperReferencePhrase: "your inseam",
        matchPhrase: "matches your inseam",
      };

    case "SKIRT_LENGTH":
      return {
        shopperLabel: "Your preferred skirt length",
        garmentLabel: "Skirt length",
        shopperReferencePhrase:
          "your preferred skirt length",
        matchPhrase:
          "matches your preferred skirt length",
      };

    case "GARMENT_LENGTH":
      return {
        shopperLabel: "Your preferred length",
        garmentLabel: "Garment length",
        shopperReferencePhrase:
          "your preferred length",
        matchPhrase:
          "matches your preferred maxi length",
      };

    default:
      return {
        shopperLabel: "Your preferred measurement",
        garmentLabel: "Length",
        shopperReferencePhrase:
          "your preferred measurement",
        matchPhrase:
          "matches your preferred measurement",
      };
  }
}