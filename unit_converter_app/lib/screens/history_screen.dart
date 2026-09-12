import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/unit_categories.dart';
import '../models/conversion_record.dart';
import '../services/analytics_service.dart';
import '../services/storage_service.dart';
import '../utils/number_format.dart';
import 'converter_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late Future<List<ConversionRecord>> _historyFuture;
  final _timeFormat = DateFormat('MMM d, h:mm a');

  @override
  void initState() {
    super.initState();
    _historyFuture = StorageService.instance.getHistory();
    unawaited(AnalyticsService.instance.logHistoryOpened());
  }

  void _reload() {
    setState(() => _historyFuture = StorageService.instance.getHistory());
  }

  Future<void> _clearHistory() async {
    await StorageService.instance.clearHistory();
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ConversionRecord>>(
      future: _historyFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final history = snapshot.data!;
        return Column(
          children: [
            if (history.isNotEmpty)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _clearHistory,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Clear history'),
                ),
              ),
            Expanded(
              child: history.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'Your last 20 conversions will show up here.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : ListView.builder(
                      itemCount: history.length,
                      itemBuilder: (context, index) {
                        final record = history[index];
                        final category = categoryById(record.categoryId);
                        final fromUnit = category.unitById(record.fromUnitId);
                        final toUnit = category.unitById(record.toUnitId);
                        return ListTile(
                          leading: Icon(category.icon),
                          title: Text(
                            '${formatConvertedValue(record.inputValue)} ${fromUnit.symbol} = '
                            '${formatConvertedValue(record.outputValue)} ${toUnit.symbol}',
                          ),
                          subtitle: Text(_timeFormat.format(record.timestamp)),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ConverterScreen(
                                  category: category,
                                  initialFromUnitId: record.fromUnitId,
                                  initialToUnitId: record.toUnitId,
                                  initialValue: record.inputValue,
                                ),
                              ),
                            ).then((_) => _reload());
                          },
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
