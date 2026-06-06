import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102A43",
        muted: "#627D98",
        line: "#D9E2EC",
        brand: "#176B87",
        green: "#11A36A",
        amber: "#F5A524"
      }
    }
  },
  plugins: []
};

export default config;
