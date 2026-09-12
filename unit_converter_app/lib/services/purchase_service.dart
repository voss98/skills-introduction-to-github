import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

import 'analytics_service.dart';
import 'storage_service.dart';

/// The one-time, non-consumable "remove ads" purchase.
///
/// Replace [removeAdsProductId] with the product ID configured in App
/// Store Connect / Google Play Console before shipping. The purchased
/// state is cached in [StorageService] so ads stay removed offline even
/// before the store confirms the entitlement on next launch.
class PurchaseService {
  PurchaseService._();
  static final PurchaseService instance = PurchaseService._();

  static const removeAdsProductId = 'remove_ads';

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;
  final _adsRemovedController = StreamController<bool>.broadcast();

  Stream<bool> get adsRemovedStream => _adsRemovedController.stream;
  bool _adsRemoved = false;
  bool get adsRemoved => _adsRemoved;

  Future<void> initialize() async {
    _adsRemoved = await StorageService.instance.getAdsRemoved();
    _adsRemovedController.add(_adsRemoved);

    final available = await _iap.isAvailable();
    if (!available) return;

    _subscription = _iap.purchaseStream.listen(
      _handlePurchaseUpdates,
      onError: (_) {},
    );
  }

  Future<ProductDetails?> _fetchRemoveAdsProduct() async {
    final response = await _iap.queryProductDetails({removeAdsProductId});
    if (response.notFoundIDs.isNotEmpty || response.productDetails.isEmpty) {
      return null;
    }
    return response.productDetails.first;
  }

  Future<bool> buyRemoveAds() async {
    final product = await _fetchRemoveAdsProduct();
    if (product == null) return false;
    final param = PurchaseParam(productDetails: product);
    return _iap.buyNonConsumable(purchaseParam: param);
  }

  Future<void> restorePurchases() async {
    await _iap.restorePurchases();
  }

  Future<void> _handlePurchaseUpdates(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      if (purchase.productID != removeAdsProductId) continue;

      final succeeded = purchase.status == PurchaseStatus.purchased ||
          purchase.status == PurchaseStatus.restored;

      if (succeeded) {
        await _markAdsRemoved();
        unawaited(AnalyticsService.instance.logRemoveAdsPurchased());
      }

      if (purchase.pendingCompletePurchase) {
        await _iap.completePurchase(purchase);
      }
    }
  }

  Future<void> _markAdsRemoved() async {
    _adsRemoved = true;
    await StorageService.instance.setAdsRemoved(true);
    _adsRemovedController.add(true);
  }

  void dispose() {
    _subscription?.cancel();
    _adsRemovedController.close();
  }
}
