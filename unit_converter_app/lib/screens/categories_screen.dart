import 'package:flutter/material.dart';

import '../data/unit_categories.dart';
import '../widgets/category_card.dart';
import 'converter_screen.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.2,
      ),
      itemCount: unitCategories.length,
      itemBuilder: (context, index) {
        final category = unitCategories[index];
        return CategoryCard(
          category: category,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ConverterScreen(category: category),
              ),
            );
          },
        );
      },
    );
  }
}
