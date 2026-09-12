import '../models/unit_definition.dart';

/// Pure, offline conversion math — no network or platform calls.
class ConversionService {
  const ConversionService._();

  static double convert({
    required UnitCategory category,
    required String fromUnitId,
    required String toUnitId,
    required double value,
  }) {
    if (fromUnitId == toUnitId) return value;
    final fromUnit = category.unitById(fromUnitId);
    final toUnit = category.unitById(toUnitId);
    final baseValue = fromUnit.toBase(value);
    return toUnit.fromBase(baseValue);
  }
}
