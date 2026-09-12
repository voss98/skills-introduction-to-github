import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/conversion_record.dart';
import '../models/favorite_conversion.dart';
import '../models/unit_definition.dart';
import '../services/analytics_service.dart';
import '../services/conversion_service.dart';
import '../services/storage_service.dart';
import '../utils/number_format.dart';

/// The main real-time converter for one category.
///
/// Optionally opened preset to a specific from/to/value (from Favorites or
/// History) via the constructor parameters.
class ConverterScreen extends StatefulWidget {
  const ConverterScreen({
    super.key,
    required this.category,
    this.initialFromUnitId,
    this.initialToUnitId,
    this.initialValue,
  });

  final UnitCategory category;
  final String? initialFromUnitId;
  final String? initialToUnitId;
  final double? initialValue;

  @override
  State<ConverterScreen> createState() => _ConverterScreenState();
}

class _ConverterScreenState extends State<ConverterScreen> {
  late String _fromUnitId;
  late String _toUnitId;
  late final TextEditingController _controller;
  Timer? _debounce;
  bool _isFavorite = false;

  @override
  void initState() {
    super.initState();
    final units = widget.category.units;
    _fromUnitId = widget.initialFromUnitId ?? units.first.id;
    _toUnitId = widget.initialToUnitId ?? (units.length > 1 ? units[1].id : units.first.id);
    _controller = TextEditingController(
      text: formatConvertedValue(widget.initialValue ?? 1),
    );
    _controller.addListener(_onValueChanged);
    _refreshFavoriteState();
    unawaited(AnalyticsService.instance.logCategorySelected(widget.category.id));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  double get _inputValue => double.tryParse(_controller.text) ?? 0;

  double _valueFor(String unitId) {
    return ConversionService.convert(
      category: widget.category,
      fromUnitId: _fromUnitId,
      toUnitId: unitId,
      value: _inputValue,
    );
  }

  String get _favoriteId =>
      FavoriteConversion.buildId(widget.category.id, _fromUnitId, _toUnitId);

  Future<void> _refreshFavoriteState() async {
    final isFavorite = await StorageService.instance.isFavorite(_favoriteId);
    if (!mounted) return;
    setState(() => _isFavorite = isFavorite);
  }

  void _onValueChanged() {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), _recordConversion);
  }

  Future<void> _recordConversion() async {
    if (_controller.text.trim().isEmpty) return;
    final output = _valueFor(_toUnitId);
    if (output.isNaN || output.isInfinite) return;

    await StorageService.instance.addHistoryEntry(
      ConversionRecord(
        categoryId: widget.category.id,
        fromUnitId: _fromUnitId,
        toUnitId: _toUnitId,
        inputValue: _inputValue,
        outputValue: output,
        timestamp: DateTime.now(),
      ),
    );
    unawaited(AnalyticsService.instance.logConversionPerformed(
      categoryId: widget.category.id,
      fromUnitId: _fromUnitId,
      toUnitId: _toUnitId,
    ));
  }

  void _swapUnits() {
    final output = _valueFor(_toUnitId);
    setState(() {
      final oldFrom = _fromUnitId;
      _fromUnitId = _toUnitId;
      _toUnitId = oldFrom;
      _controller.text = formatConvertedValue(output);
    });
    _refreshFavoriteState();
  }

  void _selectToUnit(String unitId) {
    setState(() => _toUnitId = unitId);
    _refreshFavoriteState();
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), _recordConversion);
  }

  Future<void> _toggleFavorite() async {
    final storage = StorageService.instance;
    if (_isFavorite) {
      await storage.removeFavorite(_favoriteId);
    } else {
      await storage.addFavorite(FavoriteConversion(
        id: _favoriteId,
        categoryId: widget.category.id,
        fromUnitId: _fromUnitId,
        toUnitId: _toUnitId,
      ));
    }
    unawaited(AnalyticsService.instance.logFavoriteToggled(
      categoryId: widget.category.id,
      added: !_isFavorite,
    ));
    if (!mounted) return;
    setState(() => _isFavorite = !_isFavorite);
  }

  @override
  Widget build(BuildContext context) {
    final category = widget.category;
    final fromUnit = category.unitById(_fromUnitId);
    final toUnit = category.unitById(_toUnitId);
    final result = _valueFor(_toUnitId);
    final otherUnits = category.units.where((unit) => unit.id != _fromUnitId).toList();

    return Scaffold(
      appBar: AppBar(title: Text(category.name)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _UnitDropdown(
                          category: category,
                          value: _fromUnitId,
                          onChanged: (unitId) {
                            setState(() => _fromUnitId = unitId);
                            _refreshFavoriteState();
                            _debounce?.cancel();
                            _debounce = Timer(const Duration(milliseconds: 600), _recordConversion);
                          },
                        )),
                        IconButton(
                          icon: const Icon(Icons.swap_vert),
                          tooltip: 'Swap units',
                          onPressed: _swapUnits,
                        ),
                        Expanded(child: _UnitDropdown(
                          category: category,
                          value: _toUnitId,
                          onChanged: _selectToUnit,
                        )),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _controller,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                        signed: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'^-?\d*\.?\d*')),
                      ],
                      decoration: InputDecoration(
                        labelText: fromUnit.label,
                        border: const OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${formatConvertedValue(result)} ${toUnit.symbol}',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            _isFavorite ? Icons.star : Icons.star_border,
                            color: _isFavorite ? Colors.amber : null,
                          ),
                          tooltip: _isFavorite ? 'Remove favorite' : 'Add favorite',
                          onPressed: _toggleFavorite,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('All units', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: otherUnits.length,
              itemBuilder: (context, index) {
                final unit = otherUnits[index];
                final value = _valueFor(unit.id);
                return ListTile(
                  title: Text(unit.label),
                  trailing: Text(formatConvertedValue(value)),
                  selected: unit.id == _toUnitId,
                  onTap: () => _selectToUnit(unit.id),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _UnitDropdown extends StatelessWidget {
  const _UnitDropdown({
    required this.category,
    required this.value,
    required this.onChanged,
  });

  final UnitCategory category;
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: value,
      isExpanded: true,
      items: category.units
          .map((unit) => DropdownMenuItem(value: unit.id, child: Text(unit.label)))
          .toList(),
      onChanged: (unitId) {
        if (unitId != null) onChanged(unitId);
      },
    );
  }
}
