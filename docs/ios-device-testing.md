# Local iPhone testing

CareQueue's Expo SDK 57 scene runtime supports iOS 27. The local config plugin
adds scene startup and its manifest when native iOS files are generated.

For a free Apple Personal Team, generate the native project without the unsupported
remote-push entitlement (local app features remain available):

```sh
CAREQUEUE_IOS_PERSONAL_TEAM=1 npx expo prebuild --platform ios --no-install
```

Open `ios/CareQueue.xcworkspace`, enable automatic signing for the CareQueue
target, choose your Personal Team and connected iPhone, then Run. Trust your
developer profile on the iPhone under General > VPN & Device Management.
Keep Developer Mode enabled and the phone unlocked during installation.

For debug builds, start `npm start` from the project root and allow local-network
access on the iPhone. The Mac and phone should be on the same Wi-Fi.

For an independent local test build, append the following to
`ios/.xcode.env.local` after its Node setting, then build again:

```sh
export SKIP_BUNDLING=
export EXTRA_PACKAGER_ARGS="--dev false"
```

Expo's build script embeds the JavaScript and assets without server-only JS
development tools. The app uses that embedded bundle when present; debug builds
without it still use Metro. Remove both overrides to return to normal Metro
development (and rebuild so the old embedded bundle is removed).

The Personal Team option deliberately excludes remote APNs push notifications.
Omit that environment flag for a build signed by a paid team that supports push.
Generated native files and signing credentials remain local and ignored by Git.

## Verified on 14 October 2026

Installed on the connected iPhone 17 Pro Max running iOS 27.0 with Xcode 27.0.
The final native build succeeded with zero errors; Expo reported one bundle-cache
rebuild warning. After stopping Metro, a fresh app launch succeeded. The welcome
screen, sign-in screen, demo entry, language screen, queue screen, visit screen,
and notification-preferences navigation were observed on the physical phone.
These checks used sample data. Live account sign-in, database writes, and remote
notification delivery were not tested in this device startup check.

Screenshot: `../../ios-test-evidence/carequeue-iphone-running.png`.
