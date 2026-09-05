import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photographs from classes, annual functions and celebrations at Institute of ABC.",
};

/**
 * The Laravel gallery pointed at image files that are not in the repository, so
 * the grid falls back to the assets that do exist. Drop new photographs into
 * `public/assets/images/gallery/` and add them here.
 */
const PHOTOS = [
  { src: "/about_us.jpg", title: "Our campus", year: "" },
  { src: "/assets/images/home/background1.png", title: "Computer lab", year: "" },
  { src: "/about_us.jpg", title: "Teacher's Day", year: "2016" },
  { src: "/assets/images/home/background1.png", title: "Children's Day", year: "2016" },
  { src: "/about_us.jpg", title: "Annual Function", year: "2017" },
  { src: "/assets/images/home/background1.png", title: "Workshop", year: "2018" },
];

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Life at ABC"
        title="Gallery"
        description="Classes, celebrations and the day-to-day life of our centres."
      />

      <section className="bg-neutral-50 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PHOTOS.map((photo, index) => (
            <Reveal key={`${photo.title}-${index}`} delay={(index % 3) * 80}>
              <figure className="group relative aspect-4/3 overflow-hidden rounded-2xl bg-neutral-200">
                <Image
                  src={photo.src}
                  alt={photo.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white opacity-0 transition duration-300 group-hover:opacity-100">
                  <span className="font-semibold">{photo.title}</span>
                  {photo.year ? <span className="ml-1.5 text-white/60">{photo.year}</span> : null}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
