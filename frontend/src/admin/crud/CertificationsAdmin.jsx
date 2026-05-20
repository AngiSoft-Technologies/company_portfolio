import React, { useEffect, useState } from 'react';
import { apiGet } from '../../js/httpClient';
import AdminCrudPage from './AdminCrudPage';

const CertificationsAdmin = () => {
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    apiGet('/staff').then((data) => setStaff(data || [])).catch(() => setStaff([]));
  }, []);

  return (
    <AdminCrudPage
      title="Certifications"
      description="Manage public staff certification records."
      endpoint="/certifications"
      adminEndpoint="/certifications/admin"
      createLabel="Add Certification"
      columns={[
        { key: 'name', title: 'Name' },
        { key: 'issuer', title: 'Issuer' },
        { key: 'employee', title: 'Employee', render: (_value, row) => row.employee?.name || row.employee?.username || row.employeeId },
        { key: 'year', title: 'Year' }
      ]}
      fields={[
        { name: 'employeeId', label: 'Employee', type: 'select', required: true, options: staff.map((employee) => ({ value: employee.id, label: employee.name || employee.username || employee.email })) },
        { name: 'name', label: 'Certification Name', required: true },
        { name: 'issuer', label: 'Issuer', required: true },
        { name: 'year', label: 'Year', type: 'number', nullable: true },
        { name: 'url', label: 'Credential URL', nullable: true }
      ]}
    />
  );
};

export default CertificationsAdmin;
