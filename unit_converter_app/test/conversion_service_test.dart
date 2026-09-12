import 'package:flutter_test/flutter_test.dart';
import 'package:unit_converter_app/data/unit_categories.dart';
import 'package:unit_converter_app/services/conversion_service.dart';

void main() {
  group('Length', () {
    final category = categoryById('length');

    test('1 km == 1000 m', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'km',
        toUnitId: 'm',
        value: 1,
      );
      expect(result, closeTo(1000, 1e-9));
    });

    test('1 mile == 1609.344 m', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'mi',
        toUnitId: 'm',
        value: 1,
      );
      expect(result, closeTo(1609.344, 1e-9));
    });

    test('round trip returns the original value', () {
      const value = 42.5;
      final toFeet = ConversionService.convert(
        category: category,
        fromUnitId: 'm',
        toUnitId: 'ft',
        value: value,
      );
      final backToMeters = ConversionService.convert(
        category: category,
        fromUnitId: 'ft',
        toUnitId: 'm',
        value: toFeet,
      );
      expect(backToMeters, closeTo(value, 1e-9));
    });

    test('same unit is a no-op', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'm',
        toUnitId: 'm',
        value: 7,
      );
      expect(result, 7);
    });
  });

  group('Weight', () {
    final category = categoryById('weight');

    test('1 kg == 2.2046226218 lb', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'kg',
        toUnitId: 'lb',
        value: 1,
      );
      expect(result, closeTo(2.2046226218, 1e-6));
    });
  });

  group('Temperature', () {
    final category = categoryById('temperature');

    test('0 C == 32 F', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'c',
        toUnitId: 'f',
        value: 0,
      );
      expect(result, closeTo(32, 1e-9));
    });

    test('100 C == 212 F', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'c',
        toUnitId: 'f',
        value: 100,
      );
      expect(result, closeTo(212, 1e-9));
    });

    test('0 C == 273.15 K', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'c',
        toUnitId: 'k',
        value: 0,
      );
      expect(result, closeTo(273.15, 1e-9));
    });

    test('-40 C == -40 F', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'c',
        toUnitId: 'f',
        value: -40,
      );
      expect(result, closeTo(-40, 1e-9));
    });

    test('absolute zero: 0 K == -459.67 F', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'k',
        toUnitId: 'f',
        value: 0,
      );
      expect(result, closeTo(-459.67, 1e-9));
    });
  });

  group('Volume', () {
    final category = categoryById('volume');

    test('1 US gallon == 3.785411784 liters', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'gal_us',
        toUnitId: 'l',
        value: 1,
      );
      expect(result, closeTo(3.785411784, 1e-9));
    });
  });

  group('Pressure', () {
    final category = categoryById('pressure');

    test('1 atm == 101325 Pa', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'atm',
        toUnitId: 'pa',
        value: 1,
      );
      expect(result, closeTo(101325, 1e-6));
    });

    test('1 atm == 14.6959 psi', () {
      final result = ConversionService.convert(
        category: category,
        fromUnitId: 'atm',
        toUnitId: 'psi',
        value: 1,
      );
      expect(result, closeTo(14.6959488, 1e-3));
    });
  });

  test('every category has at least two units and unique unit ids', () {
    for (final category in unitCategories) {
      expect(category.units.length, greaterThanOrEqualTo(2),
          reason: '${category.id} needs at least 2 units to convert between');
      final ids = category.units.map((unit) => unit.id).toSet();
      expect(ids.length, category.units.length,
          reason: '${category.id} has duplicate unit ids');
    }
  });
}
