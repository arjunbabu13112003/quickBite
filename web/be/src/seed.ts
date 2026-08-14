import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Hotel } from './hotels/hotel.entity';
import { Category } from './categories/category.entity';
import { Food } from './foods/food.entity';

async function bootstrap() {
  console.log('--- Starting Database Seeding ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  await dataSource.transaction(async (manager) => {
    // 1. Create or Find Hotel
    let hotel = await manager.findOne(Hotel, {
      where: { name: 'QuickBite Kitchen Kannur' },
    });

    if (!hotel) {
      console.log('Seeding demo hotel "QuickBite Kitchen Kannur"...');
      hotel = manager.create(Hotel, {
        name: 'QuickBite Kitchen Kannur',
        description: 'Delicious hot meals delivered straight to you in Kannur.',
        address: 'Near Railway Station, Fort Road, Kannur, Kerala',
        city: 'Kannur',
        state: 'Kerala',
        pincode: '670001',
        isActive: true,
        isOpen: true,
        acceptsOrders: true,
        deliveryFee: 30,
        deliveryTimeMin: 20,
        deliveryTimeMax: 35,
        supportsCOD: true,
        latitude: 11.8744,
        longitude: 75.3704,
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
      });
      hotel = await manager.save(Hotel, hotel);
      console.log(`Hotel created with ID: ${hotel.id}`);
    } else {
      console.log(`Hotel "QuickBite Kitchen Kannur" already exists with ID: ${hotel.id}`);
    }

    // 2. Create or Find Categories
    const categoriesData = [
      { name: 'Woodfired Pizzas', displayOrder: 1 },
      { name: 'Traditional Biryani', displayOrder: 2 },
      { name: 'Gourmet Burgers', displayOrder: 3 },
    ];

    const categoryMap = new Map<string, Category>();

    for (const catData of categoriesData) {
      let category = await manager.findOne(Category, {
        where: { name: catData.name, hotelId: hotel.id },
      });

      if (!category) {
        console.log(`Seeding category "${catData.name}"...`);
        category = manager.create(Category, {
          name: catData.name,
          displayOrder: catData.displayOrder,
          hotelId: hotel.id,
          isActive: true,
        });
        category = await manager.save(Category, category);
      } else {
        console.log(`Category "${catData.name}" already exists.`);
      }
      categoryMap.set(catData.name, category);
    }

    // 3. Create or Find Foods
    const foodsData = [
      {
        name: 'Classic Margherita Supreme',
        price: 349,
        categoryName: 'Woodfired Pizzas',
        description: 'Organic San Marzano tomato sauce, fresh buffalo mozzarella, extra virgin olive oil.',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80',
        isVeg: true,
        isBestseller: true,
      },
      {
        name: 'Chicken Biryani',
        price: 199,
        categoryName: 'Traditional Biryani',
        description: 'Aromatic basmati rice cooked with succulent chicken and premium spices.',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
        isVeg: false,
        isBestseller: true,
      },
      {
        name: 'Paneer Pizza',
        price: 249,
        categoryName: 'Woodfired Pizzas',
        description: 'Freshly baked pizza topped with spiced paneer, onions, and capsicum.',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80',
        isVeg: true,
        isBestseller: false,
      },
      {
        name: 'Burger',
        price: 129,
        categoryName: 'Gourmet Burgers',
        description: 'Juicy patty inside freshly toasted buns with cheddar cheese and signature sauce.',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
        isVeg: false,
        isBestseller: false,
      },
    ];

    for (const foodData of foodsData) {
      let food = await manager.findOne(Food, {
        where: { name: foodData.name, hotelId: hotel.id },
      });

      const category = categoryMap.get(foodData.categoryName);
      if (!category) {
        throw new Error(`Category "${foodData.categoryName}" not found in map.`);
      }

      if (!food) {
        console.log(`Seeding food "${foodData.name}"...`);
        food = manager.create(Food, {
          name: foodData.name,
          price: foodData.price,
          description: foodData.description,
          image: foodData.image,
          isVeg: foodData.isVeg,
          isBestseller: foodData.isBestseller,
          hotelId: hotel.id,
          categoryId: category.id,
          isAvailable: true,
          isActive: true,
          displayOrder: 0,
        });
        food = await manager.save(Food, food);
        console.log(`Food "${foodData.name}" created with ID: ${food.id}`);
      } else {
        console.log(`Food "${foodData.name}" already exists with ID: ${food.id}. Updating price/details.`);
        food.price = foodData.price;
        food.categoryId = category.id;
        food.isAvailable = true;
        food.isActive = true;
        await manager.save(Food, food);
      }
    }
  });

  console.log('--- Seeding Completed Successfully ---');
  await app.close();
}
bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
