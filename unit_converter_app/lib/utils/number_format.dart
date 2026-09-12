/// Formats a conversion result for display: trims trailing zeros and scales
/// decimal precision to the magnitude so both `1234567.89` and
/// `0.0000012` stay readable.
String formatConvertedValue(double value) {
  if (value.isNaN) return '—';
  if (value.isInfinite) return value.isNegative ? '-∞' : '∞';
  if (value == 0) return '0';

  final absValue = value.abs();
  final int decimals;
  if (absValue >= 1000) {
    decimals = 2;
  } else if (absValue >= 1) {
    decimals = 4;
  } else {
    decimals = 8;
  }

  var text = value.toStringAsFixed(decimals);
  if (text.contains('.')) {
    text = text.replaceFirst(RegExp(r'0+$'), '');
    text = text.replaceFirst(RegExp(r'\.$'), '');
  }
  return text;
}
