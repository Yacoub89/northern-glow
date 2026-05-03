#!/usr/bin/env bash
# build-gym.sh — Build a white-label gym app from branding stored in Convex.
#
# Usage:
#   ./scripts/build-gym.sh <gymId> [flags]
#
# Flags:
#   --platform ios|android|all   Which platform to build (default: all)
#   --env local|preview|prod     Which Convex deployment to hit (default: prod)
#   --profile <name>             EAS build profile override (default: gym-production)
#   --help                       Show this help
#
# Required env vars:
#   BUILD_SECRET    — matches NORTHERNGLOW_BUILD_SECRET in your Convex deployment

set -euo pipefail

# ── Convex deployment URLs ────────────────────────────────────────────────────

CONVEX_PROD="https://resolute-woodpecker-795.convex.site"
CONVEX_LOCAL="http://localhost:3211"   # npx convex dev HTTP actions port

# ── Defaults ─────────────────────────────────────────────────────────────────

GYM_ID=""
PLATFORM="all"
ENV="prod"
EAS_PROFILE="gym-production"

# ── Argument parsing ──────────────────────────────────────────────────────────

usage() {
  echo ""
  echo "Usage: ./scripts/build-gym.sh <gymId> [flags]"
  echo ""
  echo "Flags:"
  echo "  --platform ios|android|all   Platform to build (default: all)"
  echo "  --env local|preview|prod     Convex deployment (default: prod)"
  echo "  --profile <name>             EAS build profile (default: gym-production)"
  echo "  --help                       Show this help"
  echo ""
  echo "Required env vars:"
  echo "  BUILD_SECRET   matches NORTHERNGLOW_BUILD_SECRET in Convex"
  echo ""
  echo "Example:"
  echo "  BUILD_SECRET=\$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh abc123 --platform android --env prod"
  echo ""
}

if [[ $# -eq 0 ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

GYM_ID="$1"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="${2:?--platform requires ios, android, or all}"
      shift 2
      ;;
    --env)
      ENV="${2:?--env requires local, preview, or prod}"
      shift 2
      ;;
    --profile)
      EAS_PROFILE="${2:?--profile requires a profile name}"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown flag: $1"
      usage
      exit 1
      ;;
  esac
done

# ── Validate ──────────────────────────────────────────────────────────────────

if [[ -z "$GYM_ID" ]]; then
  echo "Error: gymId is required"
  usage
  exit 1
fi

if [[ ! "$PLATFORM" =~ ^(ios|android|all)$ ]]; then
  echo "Error: --platform must be ios, android, or all"
  exit 1
fi

if [[ ! "$ENV" =~ ^(local|preview|prod)$ ]]; then
  echo "Error: --env must be local, preview, or prod"
  exit 1
fi

BUILD_SECRET="${BUILD_SECRET:?BUILD_SECRET env var is required (set NORTHERNGLOW_BUILD_SECRET in .env.local)}"

# ── Resolve Convex URL ────────────────────────────────────────────────────────

case "$ENV" in
  local)   CONVEX_URL="$CONVEX_LOCAL" ;;
  preview) CONVEX_URL="$CONVEX_PROD" ;;   # update if you create a staging deployment
  prod)    CONVEX_URL="$CONVEX_PROD" ;;
esac

echo ""
echo "  gym:      $GYM_ID"
echo "  env:      $ENV → $CONVEX_URL"
echo "  platform: $PLATFORM"
echo "  profile:  $EAS_PROFILE"
echo ""

# ── 1. Fetch gym config from Convex ──────────────────────────────────────────

echo "Fetching gym config..."
# Resolve via Google DNS to avoid local DNS filtering (e.g. OpenDNS blocking convex.site)
CONVEX_HOST=$(echo "$CONVEX_URL" | sed 's|https://||' | cut -d'/' -f1)
CONVEX_IP=$(dig @8.8.8.8 "$CONVEX_HOST" +short | grep -E '^[0-9]+\.' | head -1)
RESOLVE_FLAG=""
if [[ -n "$CONVEX_IP" ]]; then
  RESOLVE_FLAG="--resolve ${CONVEX_HOST}:443:${CONVEX_IP}"
fi
RESPONSE=$(curl -sf $RESOLVE_FLAG "$CONVEX_URL/gym-build-config?gymId=$GYM_ID&secret=$BUILD_SECRET")

GYM_NAME=$(echo "$RESPONSE"      | jq -r '.name')
GYM_SLUG=$(echo "$RESPONSE"      | jq -r '.slug')
PRIMARY_COLOR=$(echo "$RESPONSE" | jq -r '.primaryColor')
BUNDLE_ID=$(echo "$RESPONSE"     | jq -r '.bundleId')
ANDROID_PACKAGE=$(echo "$RESPONSE" | jq -r '.androidPackage // empty')
SPLASH_BG=$(echo "$RESPONSE"     | jq -r '.primaryColor')
ICON_URL=$(echo "$RESPONSE"      | jq -r '.appIconUrl // empty')
SPLASH_URL=$(echo "$RESPONSE"    | jq -r '.splashUrl // empty')

if [[ -z "$ANDROID_PACKAGE" ]]; then
  ANDROID_PACKAGE=$(echo "$BUNDLE_ID" \
    | sed 's/[^A-Za-z0-9._]/_/g' \
    | sed -E 's/(^|\.)([0-9_])/\1g_\2/g' \
    | sed -E 's/\.+/./g')
fi

if [[ ! "$ANDROID_PACKAGE" =~ ^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$ ]]; then
  echo "Error: generated Android package is invalid: $ANDROID_PACKAGE"
  exit 1
fi

echo "Building for: $GYM_NAME ($GYM_SLUG) — bundle: $BUNDLE_ID — android: $ANDROID_PACKAGE"

# ── 2. Download gym assets ────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/assets"

# Back up originals once so we can always restore
if [[ ! -f "$ASSETS_DIR/icon.orig.png" ]]; then
  cp "$ASSETS_DIR/icon.png"          "$ASSETS_DIR/icon.orig.png"
  cp "$ASSETS_DIR/adaptive-icon.png" "$ASSETS_DIR/adaptive-icon.orig.png"
  cp "$ASSETS_DIR/splash.png"        "$ASSETS_DIR/splash.orig.png"
  echo "Backed up default assets"
fi

if [[ -n "$ICON_URL" ]]; then
  echo "Downloading app icon..."
  curl -sf "$ICON_URL" -o "$ASSETS_DIR/icon.png"
  curl -sf "$ICON_URL" -o "$ASSETS_DIR/adaptive-icon.png"
else
  echo "No app icon set — using default"
fi

if [[ -n "$SPLASH_URL" ]]; then
  echo "Downloading splash screen..."
  curl -sf "$SPLASH_URL" -o "$ASSETS_DIR/splash.png"
else
  echo "No splash set — using default"
fi

# ── 3. Patch iOS native files ─────────────────────────────────────────────────
# The ios/ directory is committed so EAS uses it directly (ignoring app.config.js
# for bundle ID). We patch Info.plist and the app icon in-place so gym branding
# is applied, then restore after the build.

INFO_PLIST="$ROOT_DIR/ios/NorthernGlow/Info.plist"
XCASSETS_ICON="$ROOT_DIR/ios/NorthernGlow/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"

if [[ "$PLATFORM" == "ios" ]] || [[ "$PLATFORM" == "all" ]]; then
  cp "$INFO_PLIST" "$INFO_PLIST.bak"
  cp "$XCASSETS_ICON" "$XCASSETS_ICON.bak"

  GYM_NAME="$GYM_NAME" INFO_PLIST="$INFO_PLIST" python3 -c "
import plistlib, os
path = os.environ['INFO_PLIST']
name = os.environ['GYM_NAME']
with open(path, 'rb') as f:
    plist = plistlib.load(f)
plist['CFBundleDisplayName'] = name
plist['NSFaceIDUsageDescription'] = f'Allow {name} to access Face ID for secure login.'
with open(path, 'wb') as f:
    plistlib.dump(plist, f)
"

  if [[ -n "$ICON_URL" ]]; then
    curl -sf "$ICON_URL" -o "$XCASSETS_ICON"
  fi

  echo "Patched iOS native files for $GYM_NAME"
fi

# ── 4. Bake gym values into a temporary app.config.js ────────────────────────
# EAS evaluates app.config.js on its build servers where local env vars are
# not available. We swap in a static config with all values hardcoded, then
# restore the original after the build completes.

APP_CONFIG="$ROOT_DIR/app.config.js"
APP_CONFIG_BAK="$ROOT_DIR/app.config.js.bak"

cp "$APP_CONFIG" "$APP_CONFIG_BAK"

cat > "$APP_CONFIG" <<JSEOF
// Auto-generated by build-gym.sh — DO NOT EDIT (restored after build)
export default {
  expo: {
    name: "$GYM_NAME",
    slug: "northernglow",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "$GYM_SLUG",
    userInterfaceStyle: "dark",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "$SPLASH_BG",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "$BUNDLE_ID",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "$SPLASH_BG",
      },
      package: "$ANDROID_PACKAGE",
    },
    plugins: [
      "expo-router",
      [
        "expo-secure-store",
        {
          faceIDPermission: "Allow $GYM_NAME to access Face ID for secure login.",
        },
      ],
      "@react-native-community/datetimepicker",
      "expo-font",
    ],
    web: {
      bundler: "metro",
      output: "single",
    },
    experiments: {
      typedRoutes: true,
    },
    newArchEnabled: true,
    extra: {
      gymId: "$GYM_ID",
      router: {},
      eas: {
        projectId: "83011cc3-770b-4dfc-a844-18100f134c30",
      },
    },
    owner: "yacoub89",
  },
};
JSEOF

echo "Baked gym config into app.config.js"

# ── 4. Run EAS build ─────────────────────────────────────────────────────────

echo "Starting EAS build (platform: $PLATFORM, profile: $EAS_PROFILE)..."

if [[ "$PLATFORM" == "ios" ]]; then
  eas build --platform ios --profile "$EAS_PROFILE" --non-interactive
elif [[ "$PLATFORM" == "android" ]]; then
  eas build --platform android --profile "$EAS_PROFILE" --non-interactive
else
  eas build --platform all --profile "$EAS_PROFILE" --non-interactive
fi

# ── 6. Restore default assets, app.config.js, and iOS native files ───────────

echo "Restoring default assets..."
cp "$ASSETS_DIR/icon.orig.png"          "$ASSETS_DIR/icon.png"
cp "$ASSETS_DIR/adaptive-icon.orig.png" "$ASSETS_DIR/adaptive-icon.png"
cp "$ASSETS_DIR/splash.orig.png"        "$ASSETS_DIR/splash.png"

mv "$APP_CONFIG_BAK" "$APP_CONFIG"
echo "Restored app.config.js"

if [[ -f "$INFO_PLIST.bak" ]]; then
  mv "$INFO_PLIST.bak" "$INFO_PLIST"
  mv "$XCASSETS_ICON.bak" "$XCASSETS_ICON"
  echo "Restored iOS native files"
fi

echo ""
echo "Done. Build submitted for $GYM_NAME."
