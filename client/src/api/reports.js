import client from './client.js';

export const reportsApi = {
  getWeeklyWorkload: (week) =>
    client(`/reports/weekly-workload${week ? `?week=${week}` : ''}`),
  getDepartmentReport: (week) =>
    client(`/reports/department${week ? `?week=${week}` : ''}`),
  getWeeklyWorkloadCsvUrl: (week) =>
    `/api/v1/reports/weekly-workload.csv${week ? `?week=${week}` : ''}`,
  getDepartmentCsvUrl: (week) =>
    `/api/v1/reports/department.csv${week ? `?week=${week}` : ''}`
};
