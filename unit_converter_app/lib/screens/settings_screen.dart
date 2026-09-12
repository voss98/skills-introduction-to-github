import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../services/purchase_service.dart';
import '../services/remote_config_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _busy = false;
  String _localVersion = '';

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    final info = await PackageInfo.fromPlatform();
    if (!mounted) return;
    setState(() => _localVersion = '${info.version}+${info.buildNumber}');
  }

  Future<void> _buyRemoveAds() async {
    setState(() => _busy = true);
    final started = await PurchaseService.instance.buyRemoveAds();
    if (!mounted) return;
    setState(() => _busy = false);
    if (!started) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Remove Ads is not available right now.')),
      );
    }
  }

  Future<void> _restorePurchases() async {
    setState(() => _busy = true);
    await PurchaseService.instance.restorePurchases();
    if (!mounted) return;
    setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final remoteConfig = RemoteConfigService.instance;
    return StreamBuilder<bool>(
      stream: PurchaseService.instance.adsRemovedStream,
      initialData: PurchaseService.instance.adsRemoved,
      builder: (context, snapshot) {
        final adsRemoved = snapshot.data ?? false;
        return ListView(
          children: [
            ListTile(
              leading: const Icon(Icons.block),
              title: const Text('Remove Ads'),
              subtitle: Text(adsRemoved
                  ? 'Purchased — thank you!'
                  : 'One-time purchase, \$0.99'),
              trailing: adsRemoved
                  ? const Icon(Icons.check_circle, color: Colors.green)
                  : FilledButton(
                      onPressed: _busy ? null : _buyRemoveAds,
                      child: const Text('Buy'),
                    ),
            ),
            ListTile(
              leading: const Icon(Icons.restore),
              title: const Text('Restore Purchases'),
              onTap: _busy ? null : _restorePurchases,
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('App Version'),
              subtitle: Text(_localVersion.isEmpty ? 'Loading…' : _localVersion),
            ),
            ListTile(
              leading: const Icon(Icons.cloud_outlined),
              title: const Text('Latest Available Version'),
              subtitle: Text(remoteConfig.latestAppVersion),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'All conversions run entirely on this device — no data leaves '
                'your phone to compute a result. Favorites and history are '
                'stored locally only. Anonymous usage analytics and crash '
                'reports may be sent via Firebase to help improve the app.',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          ],
        );
      },
    );
  }
}
