'use client';

import { Button } from 'antd';
import { Flexbox } from 'react-layout-kit';

const TestPage = () => {
  return (
    <Flexbox align="center" gap={24} justify="center" style={{ height: '100vh', width: '100%' }}>
      <h1>测试页面</h1>
      <Button size="large" type="primary">
        点击按钮
      </Button>
    </Flexbox>
  );
};

export default TestPage;
