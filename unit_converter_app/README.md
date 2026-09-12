# Unit Converter App

A lightweight, offline-first unit converter for iOS and Android, built with
Flutter. All conversion math runs entirely on-device — no network call is
ever made to convert a value.

## Features

- **12 categories**: Length, Weight, Temperature, Volume, Area, Speed,
  Pressure, Energy, Power, Force, Density, Flow Rate.
- **Real-time conversion**: type a value and every unit in the category
  updates instantly.
- **Favorites**: pin frequently used from/to unit pairs.
- **History**: the last 20 conversions are kept in local storage.
- **Offline-first**: works with no internet connection; Firebase telemetry
  is best-effort and never blocks a conversion.
- **Monetization**: a bottom banner ad, removable via a one-time $0.99
  in-app purchase.

## Project layout

```
lib/
  data/unit_categories.dart      12 categories + their units/conversion factors
  models/                        UnitDefinition, ConversionRecord, FavoriteConversion
  services/
    conversion_service.dart      pure conversion math (unit-tested)
    storage_service.dart         SharedPreferences: favorites, history, purchase flag
    analytics_service.dart       Firebase Analytics wrapper (no-ops without Firebase)
    remote_config_service.dart   Firebase Remote Config wrapper (app version tracking)
    purchase_service.dart        in_app_purchase: the "remove ads" product
  screens/                       Converter, Favorites, History, Settings
  widgets/                       Category grid card, bottom ad banner
test/                            Conversion math unit tests
```

## Getting started

This repository ships the Dart application source only. Generate the
native platform projects once with the Flutter SDK before building:

```bash
cd unit_converter_app
flutter create . --platforms=android,ios
flutter pub get
flutter test
flutter run
```

`flutter create .` fills in `android/`, `ios/` (and any other platform
folders you pass) around the existing `lib/`; they're intentionally left
out of version control (see `.gitignore`) since they're regenerated and
carry machine-specific paths.

## Wiring up the optional integrations

Every integration below is guarded so the app runs fully offline with none
of them configured — conversions, favorites and history all work with
zero setup.

### Firebase (Analytics, Crashlytics, Remote Config)

1. Create a Firebase project and register the Android/iOS apps.
2. Download `google-services.json` into `android/app/` and
   `GoogleService-Info.plist` into `ios/Runner/` (both gitignored here).
3. Follow the standard [Firebase Flutter setup](https://firebase.google.com/docs/flutter/setup)
   for the Gradle/CocoaPods plugin wiring.
4. In the Remote Config console, add a `latest_app_version` string and an
   `ads_enabled` boolean parameter (defaults are baked into
   `remote_config_service.dart` so the app works before you do this).

### AdMob

`lib/widgets/ad_banner.dart` currently uses Google's public **test** ad
unit IDs. Before shipping, replace them with your own AdMob banner unit
IDs and add your AdMob app IDs to `AndroidManifest.xml` /
`Info.plist` per the [google_mobile_ads setup guide](https://pub.dev/packages/google_mobile_ads).

### In-app purchase ("Remove Ads")

Create a non-consumable product with ID `remove_ads` (see
`PurchaseService.removeAdsProductId`) in App Store Connect and the Google
Play Console, priced at $0.99. No code changes are needed once the store
listings exist.

## KPIs

Firebase Analytics' built-in reporting already covers DAU, session
length, and Day 1/7/30 retention with no custom code. This app adds a
handful of custom events on top for the category- and feature-specific
KPIs from the spec:

| Event                    | Fired when...                              |
| ------------------------ | ------------------------------------------- |
| `category_selected`      | a unit category is opened                   |
| `conversion_performed`   | a value is converted (debounced while typing) |
| `favorite_added` / `favorite_removed` | a from/to pair is pinned/unpinned |
| `history_opened`         | the History tab is opened                   |
| `remove_ads_purchased`   | the ad-removal purchase completes           |

Crash-free sessions % comes from Firebase Crashlytics once configured
(`FlutterError.onError` and `PlatformDispatcher.instance.onError` are
wired to it in `main.dart`).
