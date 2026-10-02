import {
  FitGarmentComponent,
  ProductType,
} from "@prisma/client";

const COMPONENT_BY_PRODUCT_TYPE: Partial<
  Record<ProductType, FitGarmentComponent>
> = {
  ABAYA: FitGarmentComponent.ABAYA,
  DRESS: FitGarmentComponent.DRESS,
  SKIRT: FitGarmentComponent.SKIRT,
  TOP: FitGarmentComponent.TOP,
  T_SHIRT: FitGarmentComponent.TOP,
  PANTS: FitGarmentComponent.TROUSER,
  BLAZER: FitGarmentComponent.JACKET,
  COATS_JACKETS: FitGarmentComponent.JACKET,
  HIJAB: FitGarmentComponent.HIJAB,
  KHIMAR: FitGarmentComponent.KHIMAR,
  JILBAB: FitGarmentComponent.JILBAB,
};

export function getDefaultGarmentComponent(
  productTypes: readonly ProductType[]
): FitGarmentComponent {
  /*
   * A chart with exactly one product type has enough
   * semantic context for Veilora to choose a sensible
   * garment component automatically.
   *
   * Multi-product-type charts deliberately fail closed.
   * Even when two product types happen to map to the same
   * component today, we do not assume that every
   * measurement on the shared chart belongs to it.
   */
  if (productTypes.length !== 1) {
    return FitGarmentComponent.WHOLE_GARMENT;
  }

  return (
    COMPONENT_BY_PRODUCT_TYPE[
      productTypes[0]
    ] ??
    FitGarmentComponent.WHOLE_GARMENT
  );
}