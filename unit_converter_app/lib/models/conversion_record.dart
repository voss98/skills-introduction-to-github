/// A single entry in the local conversion history (max 20, most recent first).
class ConversionRecord {
  const ConversionRecord({
    required this.categoryId,
    required this.fromUnitId,
    required this.toUnitId,
    required this.inputValue,
    required this.outputValue,
    required this.timestamp,
  });

  final String categoryId;
  final String fromUnitId;
  final String toUnitId;
  final double inputValue;
  final double outputValue;
  final DateTime timestamp;

  Map<String, dynamic> toJson() => {
        'categoryId': categoryId,
        'fromUnitId': fromUnitId,
        'toUnitId': toUnitId,
        'inputValue': inputValue,
        'outputValue': outputValue,
        'timestamp': timestamp.toIso8601String(),
      };

  factory ConversionRecord.fromJson(Map<String, dynamic> json) {
    return ConversionRecord(
      categoryId: json['categoryId'] as String,
      fromUnitId: json['fromUnitId'] as String,
      toUnitId: json['toUnitId'] as String,
      inputValue: (json['inputValue'] as num).toDouble(),
      outputValue: (json['outputValue'] as num).toDouble(),
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}
