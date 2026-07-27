// app.config.js en vez de app.json: usesCleartextTraffic necesita ser
// dinámico (solo true si el backend configurado es http://, típico de
// desarrollo local contra el emulador — nunca en producción con https://).
const usesHttp = (process.env.EXPO_PUBLIC_API_URL || "").startsWith("http://");

module.exports = {
  expo: {
    name: "IVOO Infraestructura",
    slug: "ivoo-infraestructura",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "ivoo-infraestructura",
    userInterfaceStyle: "light",
    splash: {
      backgroundColor: "#0f172a",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0f172a",
      },
      usesCleartextTraffic: usesHttp,
      package: "com.ivoo.infraestructura",
    },
    web: {
      bundler: "metro",
    },
  },
};
