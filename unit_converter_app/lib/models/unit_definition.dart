import 'package:flutter/widgets.dart';

/// Converts a value expressed in this unit to/from the category's base unit.
typedef ConversionFn = double Function(double value);

/// A single selectable unit within a [UnitCategory], e.g. "Mile" in Length.
///
/// Every category picks one unit as its "base"; [toBase] and [fromBase]
/// convert between this unit and that base so any two units in a category
/// can be converted via `to.fromBase(from.toBase(value))`.
class UnitDefinition {
  const UnitDefinition({
    required this.id,
    required this.name,
    required this.symbol,
    required this.toBase,
    required this.fromBase,
  });

  /// Stable identifier used for persistence (favorites/history) — never
  /// change these once shipped, or saved user data will stop resolving.
  final String id;
  final String name;
  final String symbol;
  final ConversionFn toBase;
  final ConversionFn fromBase;

  /// Convenience constructor for units that are a simple multiple of the
  /// category's base unit (true for every category except Temperature).
  factory UnitDefinition.linear({
    required String id,
    required String name,
    required String symbol,
    required double factor,
  }) {
    return UnitDefinition(
      id: id,
      name: name,
      symbol: symbol,
      toBase: (value) => value * factor,
      fromBase: (value) => value / factor,
    );
  }

  String get label => '$name ($symbol)';
}

/// A group of related, mutually-convertible units (Length, Weight, ...).
class UnitCategory {
  const UnitCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.units,
  });

  final String id;
  final String name;
  final IconData icon;
  final List<UnitDefinition> units;

  UnitDefinition unitById(String unitId) {
    return units.firstWhere(
      (unit) => unit.id == unitId,
      orElse: () => units.first,
    );
  }
}
