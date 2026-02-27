import ProductsClient from "./ProductsClient";
import AuthShell from "@/components/AuthShell";

export default function BrandProductsPage() {
  return (
    
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Products</h1>
      <ProductsClient />
    </main>
  );
}
