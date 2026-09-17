/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        mist: "#F2F2F2",
        paper: "#F7F7F7",
        flame: {
          DEFAULT: "#FF6A00",
          mid: "#FF8C1A",
          deep: "#E04F00",
          soft: "#FFF1E6",
        },
        /** Alias — existing classNames may still use viridian* */
        viridian: {
          DEFAULT: "#FF6A00",
          deep: "#E04F00",
          soft: "#FFF1E6",
        },
        brass: "#C47A2A",
        primary: {
          50: "#FFF1E6",
          100: "#FFD8B8",
          500: "#FF6A00",
          600: "#E04F00",
          700: "#C44700",
          900: "#0A0A0A",
        },
        accent: {
          500: "#C47A2A",
          600: "#A86420",
        },
      },
      fontFamily: {
        display: ["Outfit_700Bold"],
        sans: ["IBMPlexSans_400Regular"],
      },
    },
  },
  plugins: [],
};
