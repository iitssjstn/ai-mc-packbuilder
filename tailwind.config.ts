import type { Config } from "tailwindcss";

// Design tokens, deliberately chosen for this subject (a Minecraft
// server-pack builder) rather than default SaaS-kit look:
// - squared corners everywhere (voxel/block aesthetic, no rounded cards)
// - a deep slate base instead of near-black or cream
// - emerald as the single accent (Minecraft's emerald ore), used sparingly
// - a monospace face for anything block/command-like (plugin names,
//   versions, file paths), a plain humanist sans for reading text
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#12161a",
          900: "#181d23",
          800: "#232a32",
          700: "#323b46",
          600: "#4a5563",
        },
        emerald: {
          400: "#3ecf8e",
          500: "#2bb37a",
          600: "#219a67",
        },
        clay: {
          400: "#c97b4a",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "'SF Mono'", "'Cascadia Code'", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
