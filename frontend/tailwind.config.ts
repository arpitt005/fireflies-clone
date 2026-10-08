import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#24222a",
        muted: "#77737f",
        line: "#ece9ef",
        soft: "#f7f5f8",
        accent: "#7c4dff",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(37, 31, 44, 0.07)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
    },
  },
  plugins: [],
};
export default config;
