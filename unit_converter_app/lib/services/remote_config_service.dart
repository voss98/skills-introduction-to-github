import 'package:firebase_remote_config/firebase_remote_config.dart';

/// App-version tracking via Firebase Remote Config.
///
/// Used only to let the app know the latest published version and whether
/// ads are currently enabled server-side; conversions themselves never
/// depend on this. If Firebase isn't configured, [initialize] is never
/// called and every getter falls back to the built-in default below, so
/// the app behaves identically offline.
class RemoteConfigService {
  RemoteConfigService._();
  static final RemoteConfigService instance = RemoteConfigService._();

  static const _defaults = <String, dynamic>{
    'latest_app_version': '1.0.0',
    'ads_enabled': true,
  };

  FirebaseRemoteConfig? _remoteConfig;

  Future<void> initialize() async {
    final remoteConfig = FirebaseRemoteConfig.instance;
    await remoteConfig.setConfigSettings(
      RemoteConfigSettings(
        fetchTimeout: const Duration(seconds: 10),
        minimumFetchInterval: const Duration(hours: 1),
      ),
    );
    await remoteConfig.setDefaults(_defaults);
    await remoteConfig.fetchAndActivate();
    _remoteConfig = remoteConfig;
  }

  String get latestAppVersion {
    return _remoteConfig?.getString('latest_app_version') ??
        _defaults['latest_app_version'] as String;
  }

  bool get adsEnabled {
    return _remoteConfig?.getBool('ads_enabled') ?? _defaults['ads_enabled'] as bool;
  }
}
