// Build-time settings. The website address the app talks to comes from AVERTO_API_URL (the GitHub
// workflow sets it from a repository variable); otherwise the value in app.json is used.
// AVERTO_VERSION_CODE (the build number on GitHub) lets each new APK install over the last one.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.AVERTO_VERSION_CODE) || config.android.versionCode,
  },
  extra: {
    ...config.extra,
    apiUrl: (process.env.AVERTO_API_URL || config.extra.apiUrl).replace(/\/+$/, ""),
  },
});
