import 'package:flutter/material.dart';

import '../widgets/ad_banner.dart';
import 'categories_screen.dart';
import 'favorites_screen.dart';
import 'history_screen.dart';
import 'settings_screen.dart';

class RootScreen extends StatefulWidget {
  const RootScreen({super.key});

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  int _tabIndex = 0;

  static const _tabs = [
    _Tab(title: 'Convert', icon: Icons.calculate_outlined, body: CategoriesScreen()),
    _Tab(title: 'Favorites', icon: Icons.star_outline, body: FavoritesScreen()),
    _Tab(title: 'History', icon: Icons.history, body: HistoryScreen()),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_tabs[_tabIndex].title),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: const Text('Settings')),
                    body: const SettingsScreen(),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _tabIndex,
        children: _tabs.map((tab) => tab.body).toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (index) => setState(() => _tabIndex = index),
        destinations: _tabs
            .map((tab) => NavigationDestination(icon: Icon(tab.icon), label: tab.title))
            .toList(),
      ),
      bottomSheet: const AdBanner(),
    );
  }
}

class _Tab {
  const _Tab({required this.title, required this.icon, required this.body});

  final String title;
  final IconData icon;
  final Widget body;
}
