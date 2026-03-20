/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#08090D",
        card: "#121621",
        mist: "#EEF2FF",
        pearl: "#F9FAFB",
        ember: "#FF7448",
        electric: "#4DA2FF",
        violet: "#A53BFF",
        mint: "#7BF5C3",
        line: "#23293A",
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        body: ["SpaceGrotesk_400Regular"],
        medium: ["SpaceGrotesk_500Medium"],
      },
      boxShadow: {
        glow: "0px 16px 50px rgba(59,130,246,0.25)",
      },
    },
  },
  plugins: [],
};
