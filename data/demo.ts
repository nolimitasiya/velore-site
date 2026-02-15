export type DemoDiaryPost = {
  id: string;
  title: string;
  excerpt?: string;
  imageUrl: string;
  href: string;
};
export type DemoProduct = {
  id: string;
  title: string;
  priceLabel: string;
  imageUrl: string;
};
export type DemoBrandTile = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
};

export type DemoContinent = {
  key:
    | "africa"
    | "asia"
    | "south-america"
    | "europe"
    | "north-america"
    | "australia"
    | "middle-east";
  label: string;
  imageUrl: string;
};
export type DemoPost = {
  id: string;
  title: string;
  imageUrl: string;
};


export const demo = {
  heroImage: "/home/hero.jpg",

  trendy: [
    {
      id: "p1",
      title: "Zaina skirt",
      priceLabel: "£78",
      imageUrl: "/home/trendy-1.jpg",
    },
    {
      id: "p2",
      title: "Button A-Line Dress (Fluid Crepe)",
      priceLabel: "£275.00",
      imageUrl: "/home/trendy-2.jpg",
    },
    {
      id: "p3",
      title: "Black Ruched Maxi Skirt",
      priceLabel: "£66",
      imageUrl: "/home/trendy-3.jpg",
    },
    {
      id: "p4",
      title: "Mocha Kaftan",
      priceLabel: "£170.99",
      imageUrl: "/home/trendy-4.jpg",
    },
  ],

  continents: [
    {
      key: "africa",
      label: "Africa",
      imageUrl: "/home/continent-africa.jpg",
    },
    {
      key: "asia",
      label: "Asia",
      imageUrl: "/home/continent-asia.jpg",
    },
    {
      key: "south-america",
      label: "South America",
      imageUrl: "/home/continent-south-america.jpg",
    },
    {
      key: "europe",
      label: "Europe",
      imageUrl: "/home/continent-europe.jpg",
    },
    {
      key: "north-america",
      label: "North America",
      imageUrl: "/home/continent-north-america.jpg",
    },
    {
      key: "australia",
      label: "Australia",
      imageUrl: "/home/continent-australia.jpg",
    },
    {
      key: "middle-east",
      label: "Middle East",
      imageUrl: "/home/continent-middle-east.jpg",
    },
  ] as DemoContinent[],

  styleFeed: [
    {
      id: "s1",
      title: "Winter Season Cozy",
      imageUrl: "/home/style-1.jpg",
    },
    {
      id: "s2",
      title: "Nothing like pastel summer Abaya",
      imageUrl: "/home/style-2.jpg",
    },
    {
      id: "s3",
      title: "Summer Evening Top Picks",
      imageUrl: "/home/style-3.jpg",
    },
    {
      id: "s4",
      title: "Paris Girls Season",
      imageUrl: "/home/style-4.jpg",
    },
  ],
  

  brandTiles: [
    {
      id: "b1",
      name: "ByHasanat",
      slug: "ByHasanat",
      imageUrl: "/home/brand-byhassanat.jpg",
    },
    {
      id: "b2",
      name: "Batul The Collection",
      slug: "batul-collection",
      imageUrl: "/home/brand-batul1.jpg",
    },
    {
      id: "b3",
      name: "Summer Evening",
      slug: "Summer-Evening",
      imageUrl: "/home/brand-summerevening.jpg",
    },
    {
      id: "b4",
      name: "Mayza",
      slug: "Mayza",
      imageUrl: "/home/brand-mayza.jpg",
    },
    {
      id: "b5",
      name: "Q A A F",
      slug: "qaaf",
      imageUrl: "/home/brand-qaaf.jpg",
    },
    {
      id: "b6",
      name: "Hassani",
      slug: "hassani",
      imageUrl: "/home/brand-hassani.jpg",
    },
  ] as DemoBrandTile[],

  diary: [
  {
    id: "d1",
    title: "Ramadan Diaries",
    excerpt: "Ramadan Tips.",
    imageUrl: "/home/diary-1a.jpg",
    href: "/diary/winter-neutrals",
  },
  
] as DemoDiaryPost[],

};
