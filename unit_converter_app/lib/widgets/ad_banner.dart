import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../services/purchase_service.dart';

/// Google's public test ad unit IDs. Replace with real AdMob unit IDs
/// before shipping to production.
String get _bannerAdUnitId {
  if (Platform.isAndroid) return 'ca-app-pub-3940256099942544/6300978111';
  if (Platform.isIOS) return 'ca-app-pub-3940256099942544/2934735716';
  throw UnsupportedError('Ads are only wired up for Android and iOS.');
}

/// A bottom banner ad, hidden entirely once the user buys "remove ads".
class AdBanner extends StatefulWidget {
  const AdBanner({super.key});

  @override
  State<AdBanner> createState() => _AdBannerState();
}

class _AdBannerState extends State<AdBanner> {
  BannerAd? _bannerAd;
  bool _isLoaded = false;
  bool _adsRemoved = PurchaseService.instance.adsRemoved;
  StreamSubscription<bool>? _adsRemovedSubscription;

  @override
  void initState() {
    super.initState();
    _adsRemovedSubscription = PurchaseService.instance.adsRemovedStream.listen((removed) {
      if (!mounted) return;
      setState(() => _adsRemoved = removed);
      if (removed) {
        _bannerAd?.dispose();
        _bannerAd = null;
      }
    });
    if (!_adsRemoved && (Platform.isAndroid || Platform.isIOS)) {
      _loadAd();
    }
  }

  void _loadAd() {
    _bannerAd = BannerAd(
      adUnitId: _bannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (_) {
          if (!mounted) return;
          setState(() => _isLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
        },
      ),
    )..load();
  }

  @override
  void dispose() {
    _adsRemovedSubscription?.cancel();
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_adsRemoved || !_isLoaded || _bannerAd == null) {
      return const SizedBox.shrink();
    }
    return SafeArea(
      top: false,
      child: SizedBox(
        width: _bannerAd!.size.width.toDouble(),
        height: _bannerAd!.size.height.toDouble(),
        child: AdWidget(ad: _bannerAd!),
      ),
    );
  }
}
