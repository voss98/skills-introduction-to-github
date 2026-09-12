import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/conversion_record.dart';
import '../models/favorite_conversion.dart';

/// All local persistence (favorites, history, purchase state) in one place.
/// Everything here is device-local — nothing is ever sent to a server,
/// keeping the app usable with no network connection.
class StorageService {
  StorageService._();
  static final StorageService instance = StorageService._();

  static const _historyKey = 'history_v1';
  static const _favoritesKey = 'favorites_v1';
  static const _adsRemovedKey = 'ads_removed_v1';
  static const maxHistoryEntries = 20;

  Future<List<ConversionRecord>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_historyKey) ?? const [];
    return raw
        .map((entry) => ConversionRecord.fromJson(jsonDecode(entry) as Map<String, dynamic>))
        .toList();
  }

  Future<void> addHistoryEntry(ConversionRecord record) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await getHistory();
    current.insert(0, record);
    final trimmed = current.take(maxHistoryEntries).toList();
    await prefs.setStringList(
      _historyKey,
      trimmed.map((entry) => jsonEncode(entry.toJson())).toList(),
    );
  }

  Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey);
  }

  Future<List<FavoriteConversion>> getFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_favoritesKey) ?? const [];
    return raw
        .map((entry) => FavoriteConversion.fromJson(jsonDecode(entry) as Map<String, dynamic>))
        .toList();
  }

  Future<bool> isFavorite(String favoriteId) async {
    final favorites = await getFavorites();
    return favorites.any((favorite) => favorite.id == favoriteId);
  }

  Future<void> addFavorite(FavoriteConversion favorite) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await getFavorites();
    if (current.any((existing) => existing.id == favorite.id)) return;
    current.add(favorite);
    await _saveFavorites(prefs, current);
  }

  Future<void> removeFavorite(String favoriteId) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await getFavorites();
    current.removeWhere((favorite) => favorite.id == favoriteId);
    await _saveFavorites(prefs, current);
  }

  Future<void> _saveFavorites(
    SharedPreferences prefs,
    List<FavoriteConversion> favorites,
  ) async {
    await prefs.setStringList(
      _favoritesKey,
      favorites.map((favorite) => jsonEncode(favorite.toJson())).toList(),
    );
  }

  Future<bool> getAdsRemoved() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_adsRemovedKey) ?? false;
  }

  Future<void> setAdsRemoved(bool removed) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_adsRemovedKey, removed);
  }
}
