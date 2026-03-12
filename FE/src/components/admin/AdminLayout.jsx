import { useState } from 'react';
import Sidebar from './Slidebar.jsx';
import Header from './Header.jsx';

const AdminLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Fixed on desktop, overlay on mobile */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content wrapper - với margin-left để tránh sidebar */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header - sticky top */}
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title={title}
        />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;