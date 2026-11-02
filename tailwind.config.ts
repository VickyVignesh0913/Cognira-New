import type { Config } from 'tailwindcss'

const config: Config = {
    "darkMode": [
      "class"
    ],
    "content": [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./index.html"
    ],
    "theme": {
      "extend": {
        "colors": {
          "primary": "#1E60FF",
          "secondary": "#FF9F1C",
          "accent": "#7C3AED",
          "neutral": {
            "dark": "#0A1128",
            "light": "#F4F8FC",
            "muted": "#6C7A9C",
            "soft": "#EAF0FA"
          }
        }
      }
    },
    plugins: [],
}

export default config
