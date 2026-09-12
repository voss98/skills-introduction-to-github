import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'screens/root_screen.dart';
import 'services/analytics_service.dart';
import 'services/purchase_service.dart';
import 'services/remote_config_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase (Analytics/Crashlytics/Remote Config) is optional: without
  // platform config files (google-services.json /
  // GoogleService-Info.plist) initialization throws. Every conversion
  // feature works fully offline regardless of whether this succeeds.
  try {
    await Firebase.initializeApp();
    AnalyticsService.instance.enable();
    unawaited(AnalyticsService.instance.logAppOpen());
    await RemoteConfigService.instance.initialize();

    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  } catch (error) {
    debugPrint('Firebase not configured for this build: $error');
  }

  try {
    await MobileAds.instance.initialize();
  } catch (error) {
    debugPrint('Mobile Ads SDK unavailable: $error');
  }

  await PurchaseService.instance.initialize();

  runApp(const UnitConverterApp());
}

class UnitConverterApp extends StatelessWidget {
  const UnitConverterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Unit Converter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: const RootScreen(),
    );
  }
}
