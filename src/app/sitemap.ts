import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://referidoo.com";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/como-funciona`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/registro`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/aviso-de-privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
