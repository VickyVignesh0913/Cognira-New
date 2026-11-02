// Search and AI-answer-engine settings for this app, written by MonstarX's SEO/GEO settings.
//
// Change them in Preview → SEO/GEO or through the authorized builder SEO tools, not here: every save replaces this file. The managed helper
// src/lib/monstarx/seo.ts turns them into the <head> of every page, /robots.txt, /sitemap.xml and /llms.txt.

import type { SeoConfig } from '@/lib/monstarx/seo'

export const seo: SeoConfig = {
  "siteUrl": "",
  "siteName": "Cognira",
  "defaultTitle": "Cognira — Your Personal Growth Companion",
  "titleTemplate": "%s · Cognira",
  "defaultDescription": "Cognira — your personal growth companion. AI-powered study planning, focus timer, habits and resource library.",
  "keywords": [],
  "locale": "en",
  "themeColor": "",
  "image": null,
  "imageAlt": "",
  "twitterSite": "",
  "twitterCard": "summary_large_image",
  "indexable": false,
  "robots": {
    "mode": "allow",
    "disallow": [],
    "aiCrawlers": "allow",
    "custom": ""
  },
  "sitemap": {
    "enabled": true,
    "exclude": [],
    "extra": []
  },
  "llms": {
    "enabled": true,
    "summary": "",
    "notes": ""
  },
  "organization": {
    "name": "Cognira",
    "type": "Organization",
    "logo": null,
    "sameAs": [],
    "email": "",
    "phone": "",
    "address": ""
  },
  "verification": {
    "google": "",
    "bing": "",
    "yandex": "",
    "pinterest": ""
  },
  "faq": [],
  "pages": [
    {
      "path": "/",
      "title": "Cognira — Your Personal Growth Companion"
    },
    {
      "path": "/coach",
      "title": "AI Coach — Cognira"
    },
    {
      "path": "/focus",
      "title": "Focus — Cognira"
    },
    {
      "path": "/habits",
      "title": "Habits — Cognira"
    },
    {
      "path": "/home",
      "title": "Home — Cognira"
    },
    {
      "path": "/library",
      "title": "StudyHouse — Cognira"
    },
    {
      "path": "/llms.txt"
    },
    {
      "path": "/login",
      "title": "Sign in — Cognira"
    },
    {
      "path": "/mastery"
    },
    {
      "path": "/onboarding",
      "title": "Get started — Cognira"
    },
    {
      "path": "/robots.txt"
    },
    {
      "path": "/routine",
      "title": "Routine — Cognira"
    },
    {
      "path": "/settings",
      "title": "Settings — Cognira"
    },
    {
      "path": "/sitemap.xml"
    }
  ],
  "paths": [
    "/",
    "/coach",
    "/focus",
    "/habits",
    "/home",
    "/library",
    "/llms.txt",
    "/login",
    "/mastery",
    "/onboarding",
    "/robots.txt",
    "/routine",
    "/settings",
    "/sitemap.xml"
  ],
  "privatePaths": [
    "/coach",
    "/focus"
  ]
}

export default seo
