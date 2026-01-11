import Image from "next/image";

export function Hero({ imageUrl }: { imageUrl: string }) {
  return (
    <section className="bg-[#eee]">
      <div className="relative w-full">
        <div className="relative h-[360px] sm:h-[600px] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt="Dalra hero"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
