/// A pinned "from unit -> to unit" pair within a category.
class FavoriteConversion {
  const FavoriteConversion({
    required this.id,
    required this.categoryId,
    required this.fromUnitId,
    required this.toUnitId,
  });

  /// `"$categoryId:$fromUnitId:$toUnitId"` — doubles as a natural dedupe key.
  final String id;
  final String categoryId;
  final String fromUnitId;
  final String toUnitId;

  static String buildId(String categoryId, String fromUnitId, String toUnitId) {
    return '$categoryId:$fromUnitId:$toUnitId';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'categoryId': categoryId,
        'fromUnitId': fromUnitId,
        'toUnitId': toUnitId,
      };

  factory FavoriteConversion.fromJson(Map<String, dynamic> json) {
    return FavoriteConversion(
      id: json['id'] as String,
      categoryId: json['categoryId'] as String,
      fromUnitId: json['fromUnitId'] as String,
      toUnitId: json['toUnitId'] as String,
    );
  }
}
