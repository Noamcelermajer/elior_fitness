
import React from 'react';
import Layout from '../components/Layout';
import TrainingPlan from '../components/TrainingPlan';

const TrainingPage = () => {
  return (
    <Layout currentPage="training">
      <TrainingPlan />
    </Layout>
  );
};

export default TrainingPage;
