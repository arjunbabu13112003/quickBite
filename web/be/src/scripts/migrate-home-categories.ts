import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { HomeFoodCategoriesService } from '../home-food-categories/home-food-categories.service';
import { DataSource } from 'typeorm';
import { Food } from '../foods/food.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const homeFoodCategoriesService = app.get(HomeFoodCategoriesService);
  const dataSource = app.get(DataSource);
  const foodRepository = dataSource.getRepository(Food);

  const defaultCategories = [
    { name: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80', displayOrder: 1 },
    { name: 'Pizzas', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80', displayOrder: 2 },
    { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', displayOrder: 3 },
    { name: 'Shawarma', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', displayOrder: 4 },
    { name: 'Seafood', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80', displayOrder: 5 },
    { name: 'Healthy', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', displayOrder: 6 },
  ];

  const categoryMap = {};

  for (const cat of defaultCategories) {
    try {
      const created = await homeFoodCategoriesService.create({ ...cat, isActive: true });
      categoryMap[cat.name] = created.id;
      console.log(`Created Home Food Category: ${cat.name} (ID: ${created.id})`);
    } catch (e) {
      console.log(`Failed to create or already exists: ${cat.name}`);
      const existing = await dataSource.query(`SELECT id FROM home_food_categories WHERE name = $1`, [cat.name]);
      if (existing && existing.length > 0) {
        categoryMap[cat.name] = existing[0].id;
      }
    }
  }

  const allFoods = await foodRepository.find({ relations: ['hotel'] });
  let updatedCount = 0;

  for (const item of allFoods) {
    let targetCatId = null;
    const itemName = (item.name || '').toLowerCase();
    const itemCatName = ''; // Not trivially available here without joining category but item name + rest cat is good enough

    if (itemName.includes('burger')) {
      targetCatId = categoryMap['Burgers'];
    } else if (itemName.includes('biryani') || itemName.includes('masala') || itemName.includes('curry')) {
      targetCatId = categoryMap['Biryani'];
    } else if (itemName.includes('pizza') || itemName.includes('pasta')) {
      targetCatId = categoryMap['Pizzas'];
    } else if (itemName.includes('shawarma') || itemName.includes('kebab') || itemName.includes('wrap') || itemName.includes('grill')) {
      targetCatId = categoryMap['Shawarma'];
    } else if (itemName.includes('fish') || itemName.includes('prawn') || itemName.includes('seafood') || itemName.includes('crab') || itemName.includes('squid')) {
      targetCatId = categoryMap['Seafood'];
    } else if (itemName.includes('bowl') || itemName.includes('salad') || itemName.includes('smoothie')) {
      targetCatId = categoryMap['Healthy'];
    }

    if (targetCatId) {
      item.homeFoodCategoryId = targetCatId;
      await foodRepository.save(item);
      updatedCount++;
    }
  }

  console.log(`Successfully migrated and assigned ${updatedCount} foods to Home Food Categories.`);
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
