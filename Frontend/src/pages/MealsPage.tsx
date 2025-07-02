
import React from 'react';
import Layout from '../components/Layout';
import MealMenu from '../components/MealMenu';

const MealsPage = () => {
  return (
    <Layout currentPage="meals">
      <MealMenu />
    </Layout>
  );
};

export default MealsPage;
