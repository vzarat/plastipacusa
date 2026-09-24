import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api"],
    },
    sitemap: "https://www.plastipacusa.com/sitemap.xml",
  };
}
