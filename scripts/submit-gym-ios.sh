#!/usr/bin/env bash
# submit-gym-ios.sh — Submit a white-label gym iOS build to App Store Connect.
#
# Usage:
#   ./scripts/submit-gym-ios.sh <gymId> [flags]
#
# Flags:
#   --build-id <id>              EAS build ID to submit (recommended)
#   --latest                    Submit the latest iOS build
#   --asc-app-id <id>            App Store Connect numeric app ID
#   --what-to-test <text>        TestFlight "What to Test" text
#   --env local|preview|prod     Which Convex deployment to hit (default: prod)
#   --help                      Show this help
#
# Required env vars:
#   BUILD_SECRET    — matches NORTHERNGLOW_BUILD_SECRET in your Convex deployment

set -euo pipefail

CONVEX_PROD="https://resolute-woodpecker-795.convex.site"
CONVEX_LOCAL="http://localhost:3211"

GYM_ID=""
BUILD_ID=""
USE_LATEST="false"
ASC_APP_ID=""
WHAT_TO_TEST=""
ENV="prod"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INFO_PLIST="$ROOT_DIR/ios/NorthernGlow/Info.plist"
PROJECT_PBX="$ROOT_DIR/ios/NorthernGlow.xcodeproj/project.pbxproj"
APP_CONFIG="$ROOT_DIR/app.config.js"
APP_CONFIG_BAK="$ROOT_DIR/app.config.js.bak"
EAS_JSON="$ROOT_DIR/eas.json"
EAS_JSON_BAK="$ROOT_DIR/eas.json.bak"
CLEANED_UP="false"

cleanup() {
  if [[ "$CLEANED_UP" == "true" ]]; then
    return
  fi
  CLEANED_UP="true"

  if [[ -f "$APP_CONFIG_BAK" ]]; then
    mv "$APP_CONFIG_BAK" "$APP_CONFIG"
  fi
  if [[ -f "$EAS_JSON_BAK" ]]; then
    mv "$EAS_JSON_BAK" "$EAS_JSON"
  fi
  if [[ -f "$INFO_PLIST.bak" ]]; then
    mv "$INFO_PLIST.bak" "$INFO_PLIST"
  fi
  if [[ -f "$PROJECT_PBX.bak" ]]; then
    mv "$PROJECT_PBX.bak" "$PROJECT_PBX"
  fi
}

trap cleanup EXIT

usage() {
  echo ""
  echo "Usage: ./scripts/submit-gym-ios.sh <gymId> [flags]"
  echo ""
  echo "Flags:"
  echo "  --build-id <id>              EAS build ID to submit (recommended)"
  echo "  --latest                    Submit the latest iOS build"
  echo "  --asc-app-id <id>            App Store Connect numeric app ID"
  echo "  --what-to-test <text>        TestFlight 'What to Test' text"
  echo "  --env local|preview|prod     Convex deployment (default: prod)"
  echo "  --help                      Show this help"
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
    --build-id)
      BUILD_ID="${2:?--build-id requires an EAS build ID}"
      shift 2
      ;;
    --latest)
      USE_LATEST="true"
      shift
      ;;
    --asc-app-id)
      ASC_APP_ID="${2:?--asc-app-id requires an App Store Connect app ID}"
      shift 2
      ;;
    --what-to-test)
      WHAT_TO_TEST="${2:?--what-to-test requires text}"
      shift 2
      ;;
    --env)
      ENV="${2:?--env requires local, preview, or prod}"
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

if [[ -z "$BUILD_ID" && "$USE_LATEST" != "true" ]]; then
  echo "Error: provide --build-id <id> or --latest"
  exit 1
fi

if [[ ! "$ENV" =~ ^(local|preview|prod)$ ]]; then
  echo "Error: --env must be local, preview, or prod"
  exit 1
fi

BUILD_SECRET="${BUILD_SECRET:?BUILD_SECRET env var is required}"

case "$ENV" in
  local) CONVEX_URL="$CONVEX_LOCAL" ;;
  preview) CONVEX_URL="$CONVEX_PROD" ;;
  prod) CONVEX_URL="$CONVEX_PROD" ;;
esac

echo ""
echo "  gym:    $GYM_ID"
echo "  env:    $ENV -> $CONVEX_URL"
echo "  submit: $([[ -n "$BUILD_ID" ]] && echo "$BUILD_ID" || echo "latest iOS build")"
echo "  asc:    ${ASC_APP_ID:-not set}"
echo ""

echo "Fetching gym config..."
CONVEX_HOST=$(echo "$CONVEX_URL" | sed 's|https://||' | cut -d'/' -f1)
CONVEX_IP=$(dig @8.8.8.8 "$CONVEX_HOST" +short | grep -E '^[0-9]+\.' | head -1)
RESOLVE_FLAG=""
if [[ -n "$CONVEX_IP" ]]; then
  RESOLVE_FLAG="--resolve ${CONVEX_HOST}:443:${CONVEX_IP}"
fi
RESPONSE=$(curl -sf $RESOLVE_FLAG "$CONVEX_URL/gym-build-config?gymId=$GYM_ID&secret=$BUILD_SECRET")

GYM_NAME=$(echo "$RESPONSE" | jq -r '.name')
GYM_SLUG=$(echo "$RESPONSE" | jq -r '.slug')
PRIMARY_COLOR=$(echo "$RESPONSE" | jq -r '.primaryColor')
BUNDLE_ID=$(echo "$RESPONSE" | jq -r '.bundleId')
ANDROID_PACKAGE=$(echo "$RESPONSE" | jq -r '.androidPackage // empty')

if [[ -z "$ANDROID_PACKAGE" ]]; then
  ANDROID_PACKAGE="$BUNDLE_ID"
fi

echo "Submitting for: $GYM_NAME ($GYM_SLUG) — bundle: $BUNDLE_ID"

cp "$INFO_PLIST" "$INFO_PLIST.bak"
cp "$PROJECT_PBX" "$PROJECT_PBX.bak"
cp "$APP_CONFIG" "$APP_CONFIG_BAK"
cp "$EAS_JSON" "$EAS_JSON_BAK"

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

BUNDLE_ID="$BUNDLE_ID" PROJECT_PBX="$PROJECT_PBX" python3 -c "
import os, re
path = os.environ['PROJECT_PBX']
bundle_id = os.environ['BUNDLE_ID']
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
text = re.sub(
    r'PRODUCT_BUNDLE_IDENTIFIER = [^;]+;',
    f'PRODUCT_BUNDLE_IDENTIFIER = {bundle_id};',
    text,
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
"

cat > "$APP_CONFIG" <<JSEOF
// Auto-generated by submit-gym-ios.sh — DO NOT EDIT (restored after submit)
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
      backgroundColor: "$PRIMARY_COLOR",
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
        backgroundColor: "$PRIMARY_COLOR",
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

if [[ -n "$ASC_APP_ID" ]]; then
  EAS_PROFILE="gym-production"
  EAS_JSON="$EAS_JSON" EAS_PROFILE="$EAS_PROFILE" ASC_APP_ID="$ASC_APP_ID" node -e "
const fs = require('fs');
const path = process.env.EAS_JSON;
const profile = process.env.EAS_PROFILE;
const ascAppId = process.env.ASC_APP_ID;
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
json.submit = json.submit || {};
json.submit[profile] = json.submit[profile] || {};
json.submit[profile].ios = json.submit[profile].ios || {};
json.submit[profile].ios.ascAppId = ascAppId;
fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
"
fi

args=(--platform ios --non-interactive)
if [[ -n "$BUILD_ID" ]]; then
  args+=(--id "$BUILD_ID")
else
  args+=(--latest)
fi
if [[ -n "$WHAT_TO_TEST" ]]; then
  args+=(--what-to-test "$WHAT_TO_TEST")
fi

eas submit "${args[@]}"

echo ""
echo "Done. Submitted build for $GYM_NAME."
