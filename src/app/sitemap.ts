import type { MetadataRoute } from "next";
import { getProducts } from "@/actions/products";

const SITE_URL = "https://www.plastipacusa.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/credit-application`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/free-sample`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    const products = await getProducts("all");
    productRoutes = (products || [])
      .filter((product) => Boolean(product?.slug))
      .map((product) => ({
        url: `${SITE_URL}/products/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (error) {
    console.warn("sitemap: failed to load products", error);
  }

  return [...staticRoutes, ...productRoutes];
}
