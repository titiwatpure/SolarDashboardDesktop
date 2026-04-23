import React, { useState, useEffect } from 'react';
import KPICards from '../components/KPICards';
import Pipeline from '../components/Pipeline';
import ProjectsTable from '../components/ProjectsTable';
import FilterPanel from '../components/FilterPanel';
import ProjectModal from '../components/ProjectModal';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [filters, setFilters] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          <Plus size={20} />
          เพิ่มโครงการใหม่
        </button>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Pipeline */}
      <Pipeline />

      {/* Filter and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FilterPanel onFilterChange={handleFilterChange} />
        </div>
        <div className="lg:col-span-3">
          <ProjectsTable filters={filters} />
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={() => window.location.reload()}
      />
    </div>
  );
}
