export default {
  plugins: {
    // Tailwind v4 moved its PostCSS plugin to a dedicated package; using
    // `tailwindcss` directly here is rejected by newer 4.x releases.
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
