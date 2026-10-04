import React from 'react';
import { Category } from '../../types';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <section className="section-wrapper" style={{ paddingBottom: '10px' }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Shop by Category</h2>
          <p className="section-subtitle">Handpicked fresh groceries and daily essentials</p>
        </div>
      </div>

      <div className="category-scroll-container">
        {/* All Categories Option */}
        <div
          className={`category-card ${selectedCategoryId === '' ? 'active' : ''}`}
          onClick={() => onSelectCategory('')}
        >
          <div className="category-icon-box">
            🌟
          </div>
          <h3>All Items</h3>
          <span>All products</span>
        </div>

        {/* Dynamic Categories from DB */}
        {categories.map(cat => {
          const isActive = selectedCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              className={`category-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div className="category-icon-box">
                {cat.icon || '🛍️'}
              </div>
              <h3>{cat.name}</h3>
              <span>{cat.product_count !== undefined ? `${cat.product_count} items` : 'Fresh'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
