import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { motion } from 'framer-motion';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Floating Icon Rail */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F4F6F8]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
