// Signs release builds with our own key instead of the debug key. The keystore path and passwords
// come from environment variables at build time (GitHub Secrets), so they are never in the code.
// Without them the build falls back to the debug key, which is fine for trying the app out but
// cannot be installed over a properly signed version.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// averto-release-signing";

const block = `
${MARKER}
if (System.getenv("AVERTO_KEYSTORE_FILE")) {
    android {
        signingConfigs {
            avertoRelease {
                storeFile file(System.getenv("AVERTO_KEYSTORE_FILE"))
                storePassword System.getenv("AVERTO_KEYSTORE_PASSWORD")
                keyAlias System.getenv("AVERTO_KEY_ALIAS")
                keyPassword System.getenv("AVERTO_KEY_PASSWORD")
            }
        }
        buildTypes {
            release {
                signingConfig signingConfigs.avertoRelease
            }
        }
    }
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += block;
    }
    return config;
  });
};
