import 'dart:async';

import 'package:flutter/material.dart';

import '../data/unit_categories.dart';
import '../models/favorite_conversion.dart';
import '../services/analytics_service.dart';
import '../services/storage_service.dart';
import 'converter_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  late Future<List<FavoriteConversion>> _favoritesFuture;

  @override
  void initState() {
    super.initState();
    _favoritesFuture = StorageService.instance.getFavorites();
  }

  void _reload() {
    setState(() => _favoritesFuture = StorageService.instance.getFavorites());
  }

  Future<void> _remove(FavoriteConversion favorite) async {
    await StorageService.instance.removeFavorite(favorite.id);
    unawaited(AnalyticsService.instance.logFavoriteToggled(
      categoryId: favorite.categoryId,
      added: false,
    ));
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<FavoriteConversion>>(
      future: _favoritesFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final favorites = snapshot.data!;
        if (favorites.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'No favorites yet. Tap the star on any conversion to pin it here.',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }
        return ListView.builder(
          itemCount: favorites.length,
          itemBuilder: (context, index) {
            final favorite = favorites[index];
            final category = categoryById(favorite.categoryId);
            final fromUnit = category.unitById(favorite.fromUnitId);
            final toUnit = category.unitById(favorite.toUnitId);
            return ListTile(
              leading: Icon(category.icon),
              title: Text('${fromUnit.name} → ${toUnit.name}'),
              subtitle: Text(category.name),
              trailing: IconButton(
                icon: const Icon(Icons.star, color: Colors.amber),
                onPressed: () => _remove(favorite),
              ),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ConverterScreen(
                      category: category,
                      initialFromUnitId: favorite.fromUnitId,
                      initialToUnitId: favorite.toUnitId,
                    ),
                  ),
                ).then((_) => _reload());
              },
            );
          },
        );
      },
    );
  }
}
