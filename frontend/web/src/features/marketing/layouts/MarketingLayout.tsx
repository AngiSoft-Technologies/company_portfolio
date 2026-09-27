// @ts-nocheck
import { Outlet } from 'react-router-dom';
import Header from '../components/sections/Header';
import Footer from '../components/sections/Footer';

export function MarketingLayout() {
  return (
    <>
      <Header />
      <main className="content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default MarketingLayout;
