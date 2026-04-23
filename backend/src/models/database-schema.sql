-- Create database
-- CREATE DATABASE solar_dashboard;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'engineer', -- 'admin', 'engineer'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(255) NOT NULL,
  project_code VARCHAR(100) UNIQUE NOT NULL,
  size_kw DECIMAL(10, 2) NOT NULL,
  size_kva DECIMAL(10, 2),
  province VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'blocked', 'completed'
  current_step VARCHAR(50) NOT NULL DEFAULT 'survey', -- 'survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'
  responsible_user UUID REFERENCES users(id),
  description TEXT,
  has_power_selling BOOLEAN DEFAULT FALSE,
  requires_permit BOOLEAN,
  permit_type VARCHAR(100), -- 'exemption', 'permit'
  start_date TIMESTAMP,
  expected_cod_date TIMESTAMP,
  actual_cod_date TIMESTAMP,
  blocked_reason TEXT,
  blocked_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations Table (หน่วยงาน)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name VARCHAR(255) NOT NULL UNIQUE,
  org_type VARCHAR(100) NOT NULL, -- 'erc', 'pea', 'mea', 'tambon', 'municipal', 'factory', 'industrial'
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Status Timeline (ขั้นตอนงาน)
CREATE TABLE IF NOT EXISTS project_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name VARCHAR(100) NOT NULL, -- 'survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  responsible_org UUID REFERENCES organizations(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- 'sld', 'permit', 'test_report', 'other'
  file_path VARCHAR(500),
  file_size BIGINT,
  upload_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Project Organization Relations (ความเกี่ยวข้องระหว่างโครงการและหน่วยงาน)
CREATE TABLE IF NOT EXISTS project_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status VARCHAR(50), -- 'pending', 'approved', 'rejected'
  submitted_date TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_current_step ON projects(current_step);
CREATE INDEX idx_projects_province ON projects(province);
CREATE INDEX idx_projects_responsible_user ON projects(responsible_user);
CREATE INDEX idx_project_steps_project_id ON project_steps(project_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_project_organizations_project_id ON project_organizations(project_id);
CREATE INDEX idx_users_role ON users(role);
