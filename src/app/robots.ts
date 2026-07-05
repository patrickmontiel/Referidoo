import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Superficies privadas o con token — fuera de los buscadores.
        disallow: ["/admin", "/owner", "/api/", "/c/", "/r/", "/verificar"],
      },
    ],
    sitemap: "https://referidoo.com/sitemap.xml",
  };
}
