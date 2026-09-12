import 'package:firebase_analytics/firebase_analytics.dart';

/// Thin wrapper around Firebase Analytics.
///
/// `enable()` is only called from `main()` after `Firebase.initializeApp()`
/// succeeds. Builds without a Firebase project configured (no
/// google-services.json / GoogleService-Info.plist) skip that call, so
/// every method here silently no-ops instead of throwing — analytics is
/// additive telemetry, never a requirement for the app to function.
class AnalyticsService {
  AnalyticsService._();
  static final AnalyticsService instance = AnalyticsService._();

  FirebaseAnalytics? _analytics;

  void enable() {
    _analytics = FirebaseAnalytics.instance;
  }

  Future<void> logAppOpen() async {
    await _analytics?.logAppOpen();
  }

  Future<void> logCategorySelected(String categoryId) async {
    await _analytics?.logEvent(
      name: 'category_selected',
      parameters: {'category_id': categoryId},
    );
  }

  Future<void> logConversionPerformed({
    required String categoryId,
    required String fromUnitId,
    required String toUnitId,
  }) async {
    await _analytics?.logEvent(
      name: 'conversion_performed',
      parameters: {
        'category_id': categoryId,
        'from_unit': fromUnitId,
        'to_unit': toUnitId,
      },
    );
  }

  Future<void> logFavoriteToggled({
    required String categoryId,
    required bool added,
  }) async {
    await _analytics?.logEvent(
      name: added ? 'favorite_added' : 'favorite_removed',
      parameters: {'category_id': categoryId},
    );
  }

  Future<void> logHistoryOpened() async {
    await _analytics?.logEvent(name: 'history_opened');
  }

  Future<void> logRemoveAdsPurchased() async {
    await _analytics?.logEvent(name: 'remove_ads_purchased');
  }
}
