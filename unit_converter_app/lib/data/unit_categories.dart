import 'package:flutter/material.dart';

import '../models/unit_definition.dart';

/// All 12 supported categories with their units and conversion factors.
///
/// Every category (other than Temperature, which needs affine conversions)
/// picks a base unit and expresses every other unit as a linear factor of
/// it, so conversion is always `to.fromBase(from.toBase(value))`.
final List<UnitCategory> unitCategories = [
  _length,
  _weight,
  _temperature,
  _volume,
  _area,
  _speed,
  _pressure,
  _energy,
  _power,
  _force,
  _density,
  _flowRate,
];

UnitCategory categoryById(String id) {
  return unitCategories.firstWhere((category) => category.id == id);
}

// Base unit: meter.
final _length = UnitCategory(
  id: 'length',
  name: 'Length',
  icon: Icons.straighten,
  units: [
    UnitDefinition.linear(id: 'mm', name: 'Millimeter', symbol: 'mm', factor: 0.001),
    UnitDefinition.linear(id: 'cm', name: 'Centimeter', symbol: 'cm', factor: 0.01),
    UnitDefinition.linear(id: 'm', name: 'Meter', symbol: 'm', factor: 1),
    UnitDefinition.linear(id: 'km', name: 'Kilometer', symbol: 'km', factor: 1000),
    UnitDefinition.linear(id: 'in', name: 'Inch', symbol: 'in', factor: 0.0254),
    UnitDefinition.linear(id: 'ft', name: 'Foot', symbol: 'ft', factor: 0.3048),
    UnitDefinition.linear(id: 'yd', name: 'Yard', symbol: 'yd', factor: 0.9144),
    UnitDefinition.linear(id: 'mi', name: 'Mile', symbol: 'mi', factor: 1609.344),
    UnitDefinition.linear(id: 'nmi', name: 'Nautical Mile', symbol: 'nmi', factor: 1852),
  ],
);

// Base unit: kilogram.
final _weight = UnitCategory(
  id: 'weight',
  name: 'Weight',
  icon: Icons.monitor_weight_outlined,
  units: [
    UnitDefinition.linear(id: 'mg', name: 'Milligram', symbol: 'mg', factor: 1e-6),
    UnitDefinition.linear(id: 'g', name: 'Gram', symbol: 'g', factor: 0.001),
    UnitDefinition.linear(id: 'kg', name: 'Kilogram', symbol: 'kg', factor: 1),
    UnitDefinition.linear(id: 't', name: 'Metric Ton', symbol: 't', factor: 1000),
    UnitDefinition.linear(id: 'oz', name: 'Ounce', symbol: 'oz', factor: 0.028349523125),
    UnitDefinition.linear(id: 'lb', name: 'Pound', symbol: 'lb', factor: 0.45359237),
    UnitDefinition.linear(id: 'st', name: 'Stone', symbol: 'st', factor: 6.35029318),
    UnitDefinition.linear(id: 'ton_us', name: 'US Ton', symbol: 'ton', factor: 907.18474),
  ],
);

// Base unit: Celsius.
final _temperature = UnitCategory(
  id: 'temperature',
  name: 'Temperature',
  icon: Icons.thermostat,
  units: [
    UnitDefinition(
      id: 'c',
      name: 'Celsius',
      symbol: '°C',
      toBase: (v) => v,
      fromBase: (v) => v,
    ),
    UnitDefinition(
      id: 'f',
      name: 'Fahrenheit',
      symbol: '°F',
      toBase: (v) => (v - 32) * 5 / 9,
      fromBase: (v) => v * 9 / 5 + 32,
    ),
    UnitDefinition(
      id: 'k',
      name: 'Kelvin',
      symbol: 'K',
      toBase: (v) => v - 273.15,
      fromBase: (v) => v + 273.15,
    ),
    UnitDefinition(
      id: 'r',
      name: 'Rankine',
      symbol: '°R',
      toBase: (v) => (v - 491.67) * 5 / 9,
      fromBase: (v) => (v + 273.15) * 9 / 5,
    ),
  ],
);

// Base unit: liter.
final _volume = UnitCategory(
  id: 'volume',
  name: 'Volume',
  icon: Icons.local_drink_outlined,
  units: [
    UnitDefinition.linear(id: 'ml', name: 'Milliliter', symbol: 'mL', factor: 0.001),
    UnitDefinition.linear(id: 'l', name: 'Liter', symbol: 'L', factor: 1),
    UnitDefinition.linear(id: 'm3', name: 'Cubic Meter', symbol: 'm³', factor: 1000),
    UnitDefinition.linear(id: 'in3', name: 'Cubic Inch', symbol: 'in³', factor: 0.016387064),
    UnitDefinition.linear(id: 'ft3', name: 'Cubic Foot', symbol: 'ft³', factor: 28.316846592),
    UnitDefinition.linear(id: 'gal_us', name: 'US Gallon', symbol: 'gal', factor: 3.785411784),
    UnitDefinition.linear(id: 'qt_us', name: 'US Quart', symbol: 'qt', factor: 0.946352946),
    UnitDefinition.linear(id: 'pt_us', name: 'US Pint', symbol: 'pt', factor: 0.473176473),
    UnitDefinition.linear(id: 'cup_us', name: 'US Cup', symbol: 'cup', factor: 0.2365882365),
    UnitDefinition.linear(id: 'floz_us', name: 'US Fluid Ounce', symbol: 'fl oz', factor: 0.0295735295625),
    UnitDefinition.linear(id: 'gal_uk', name: 'Imperial Gallon', symbol: 'imp gal', factor: 4.54609),
  ],
);

// Base unit: square meter.
final _area = UnitCategory(
  id: 'area',
  name: 'Area',
  icon: Icons.crop_square,
  units: [
    UnitDefinition.linear(id: 'mm2', name: 'Sq. Millimeter', symbol: 'mm²', factor: 1e-6),
    UnitDefinition.linear(id: 'cm2', name: 'Sq. Centimeter', symbol: 'cm²', factor: 1e-4),
    UnitDefinition.linear(id: 'm2', name: 'Sq. Meter', symbol: 'm²', factor: 1),
    UnitDefinition.linear(id: 'ha', name: 'Hectare', symbol: 'ha', factor: 10000),
    UnitDefinition.linear(id: 'km2', name: 'Sq. Kilometer', symbol: 'km²', factor: 1e6),
    UnitDefinition.linear(id: 'in2', name: 'Sq. Inch', symbol: 'in²', factor: 0.00064516),
    UnitDefinition.linear(id: 'ft2', name: 'Sq. Foot', symbol: 'ft²', factor: 0.09290304),
    UnitDefinition.linear(id: 'yd2', name: 'Sq. Yard', symbol: 'yd²', factor: 0.83612736),
    UnitDefinition.linear(id: 'acre', name: 'Acre', symbol: 'ac', factor: 4046.8564224),
    UnitDefinition.linear(id: 'mi2', name: 'Sq. Mile', symbol: 'mi²', factor: 2589988.110336),
  ],
);

// Base unit: meters per second.
final _speed = UnitCategory(
  id: 'speed',
  name: 'Speed',
  icon: Icons.speed,
  units: [
    UnitDefinition.linear(id: 'mps', name: 'Meters/Second', symbol: 'm/s', factor: 1),
    UnitDefinition.linear(id: 'kmh', name: 'Kilometers/Hour', symbol: 'km/h', factor: 1000 / 3600),
    UnitDefinition.linear(id: 'mph', name: 'Miles/Hour', symbol: 'mph', factor: 0.44704),
    UnitDefinition.linear(id: 'kn', name: 'Knot', symbol: 'kn', factor: 0.5144444444),
    UnitDefinition.linear(id: 'fps', name: 'Feet/Second', symbol: 'ft/s', factor: 0.3048),
  ],
);

// Base unit: pascal.
final _pressure = UnitCategory(
  id: 'pressure',
  name: 'Pressure',
  icon: Icons.compress,
  units: [
    UnitDefinition.linear(id: 'pa', name: 'Pascal', symbol: 'Pa', factor: 1),
    UnitDefinition.linear(id: 'kpa', name: 'Kilopascal', symbol: 'kPa', factor: 1000),
    UnitDefinition.linear(id: 'bar', name: 'Bar', symbol: 'bar', factor: 100000),
    UnitDefinition.linear(id: 'psi', name: 'PSI', symbol: 'psi', factor: 6894.757293168),
    UnitDefinition.linear(id: 'atm', name: 'Atmosphere', symbol: 'atm', factor: 101325),
    UnitDefinition.linear(id: 'mmhg', name: 'mmHg', symbol: 'mmHg', factor: 133.322387415),
    UnitDefinition.linear(id: 'torr', name: 'Torr', symbol: 'Torr', factor: 101325 / 760),
  ],
);

// Base unit: joule.
final _energy = UnitCategory(
  id: 'energy',
  name: 'Energy',
  icon: Icons.bolt,
  units: [
    UnitDefinition.linear(id: 'j', name: 'Joule', symbol: 'J', factor: 1),
    UnitDefinition.linear(id: 'kj', name: 'Kilojoule', symbol: 'kJ', factor: 1000),
    UnitDefinition.linear(id: 'cal', name: 'Calorie', symbol: 'cal', factor: 4.184),
    UnitDefinition.linear(id: 'kcal', name: 'Kilocalorie', symbol: 'kcal', factor: 4184),
    UnitDefinition.linear(id: 'wh', name: 'Watt-hour', symbol: 'Wh', factor: 3600),
    UnitDefinition.linear(id: 'kwh', name: 'Kilowatt-hour', symbol: 'kWh', factor: 3600000),
    UnitDefinition.linear(id: 'btu', name: 'BTU', symbol: 'BTU', factor: 1055.05585262),
  ],
);

// Base unit: watt.
final _power = UnitCategory(
  id: 'power',
  name: 'Power',
  icon: Icons.electric_bolt,
  units: [
    UnitDefinition.linear(id: 'w', name: 'Watt', symbol: 'W', factor: 1),
    UnitDefinition.linear(id: 'kw', name: 'Kilowatt', symbol: 'kW', factor: 1000),
    UnitDefinition.linear(id: 'mw', name: 'Megawatt', symbol: 'MW', factor: 1e6),
    UnitDefinition.linear(id: 'hp', name: 'Horsepower', symbol: 'hp', factor: 745.699871582),
    UnitDefinition.linear(id: 'btuh', name: 'BTU/hour', symbol: 'BTU/h', factor: 0.29307107),
  ],
);

// Base unit: newton.
final _force = UnitCategory(
  id: 'force',
  name: 'Force',
  icon: Icons.fitness_center,
  units: [
    UnitDefinition.linear(id: 'n', name: 'Newton', symbol: 'N', factor: 1),
    UnitDefinition.linear(id: 'kn', name: 'Kilonewton', symbol: 'kN', factor: 1000),
    UnitDefinition.linear(id: 'dyn', name: 'Dyne', symbol: 'dyn', factor: 1e-5),
    UnitDefinition.linear(id: 'lbf', name: 'Pound-force', symbol: 'lbf', factor: 4.4482216153),
    UnitDefinition.linear(id: 'kgf', name: 'Kilogram-force', symbol: 'kgf', factor: 9.80665),
  ],
);

// Base unit: kilograms per cubic meter.
final _density = UnitCategory(
  id: 'density',
  name: 'Density',
  icon: Icons.science_outlined,
  units: [
    UnitDefinition.linear(id: 'kgm3', name: 'Kilogram/m³', symbol: 'kg/m³', factor: 1),
    UnitDefinition.linear(id: 'gcm3', name: 'Gram/cm³', symbol: 'g/cm³', factor: 1000),
    UnitDefinition.linear(id: 'gml', name: 'Gram/mL', symbol: 'g/mL', factor: 1000),
    UnitDefinition.linear(id: 'lbft3', name: 'Pound/ft³', symbol: 'lb/ft³', factor: 16.018463374),
    UnitDefinition.linear(id: 'lbgal', name: 'Pound/US Gallon', symbol: 'lb/gal', factor: 119.826427317),
  ],
);

// Base unit: cubic meters per second.
final _flowRate = UnitCategory(
  id: 'flow_rate',
  name: 'Flow Rate',
  icon: Icons.water_drop_outlined,
  units: [
    UnitDefinition.linear(id: 'm3s', name: 'Cubic Meter/Second', symbol: 'm³/s', factor: 1),
    UnitDefinition.linear(id: 'ls', name: 'Liter/Second', symbol: 'L/s', factor: 0.001),
    UnitDefinition.linear(id: 'lmin', name: 'Liter/Minute', symbol: 'L/min', factor: 0.001 / 60),
    UnitDefinition.linear(id: 'galmin_us', name: 'US Gallon/Minute', symbol: 'gal/min', factor: 3.785411784 / 60 / 1000),
    UnitDefinition.linear(id: 'ft3min', name: 'Cubic Foot/Minute', symbol: 'ft³/min', factor: 0.028316846592 / 60),
  ],
);
