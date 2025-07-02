
import React from 'react';
import Layout from '../components/Layout';
import ProgressTracking from '../components/ProgressTracking';

const ProgressPage = () => {
  return (
    <Layout currentPage="progress">
      <ProgressTracking />
    </Layout>
  );
};

export default ProgressPage;
