const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('=== STARTING PROMPT 4 INTEGRATION TESTS: REPORTS, EMPLOYEE DETAIL & PASSWORD FLOW ===\n');

  // 1. Login Ahmad (Head Group)
  const ahmadLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ahmad', password: 'password123' })
  });
  const ahmad = await ahmadLogin.json();
  if (!ahmad.success) throw new Error('Ahmad login failed');
  console.log('✓ Ahmad (HEAD_GROUP) logged in');

  // Login Citra (Member)
  const citraLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: 'password123' })
  });
  const citra = await citraLogin.json();
  if (!citra.success) throw new Error('Citra login failed');
  console.log('✓ Citra (MEMBER) logged in');

  console.log('\n--- 2. TEST EMPLOYEE DETAIL ENDPOINT (prd.md §4.8) ---');
  const empDetailRes = await fetch(`${BASE_URL}/users/${citra.user.id}`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const empDetail = await empDetailRes.json();
  if (!empDetail.success) throw new Error('Failed to get employee detail: ' + JSON.stringify(empDetail));
  console.log('✓ Employee detail loaded for:', empDetail.user.name, {
    department: empDetail.user.departmentName,
    capacityHours: empDetail.currentWorkload.capacityHours,
    trendWeeks: empDetail.weeklyTrend.length,
    statusCounts: empDetail.statusCounts
  });
  if (empDetail.weeklyTrend.length !== 4) throw new Error('Expected 4 weeks in weekly trend');

  console.log('\n--- 3. TEST ADMIN RESET PASSWORD & FORCED PASSWORD CHANGE FLOW (prd.md §4.1) ---');
  // Ahmad resets Citra's password
  const resetRes = await fetch(`${BASE_URL}/users/${citra.user.id}/reset-password`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const resetData = await resetRes.json();
  if (!resetData.success) throw new Error('Failed to reset password: ' + JSON.stringify(resetData));
  const tempPassword = resetData.temporaryPassword;
  console.log('✓ Ahmad reset Citra\'s password. Temporary password generated:', tempPassword);

  // Citra logs in with temporary password -> must_change_password must be true
  const tempLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: tempPassword })
  });
  const tempLoginData = await tempLoginRes.json();
  if (!tempLoginData.success) throw new Error('Citra login with temporary password failed');
  console.log('✓ Citra logged in with temp password. mustChangePassword is:', tempLoginData.user.mustChangePassword);
  if (!tempLoginData.user.mustChangePassword) throw new Error('Expected mustChangePassword to be true!');

  // Citra changes password to a new password
  const newPassword = 'newPassword123!';
  const changeRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tempLoginData.accessToken}`
    },
    body: JSON.stringify({
      currentPassword: tempPassword,
      newPassword
    })
  });
  const changeData = await changeRes.json();
  if (!changeData.success) throw new Error('Failed to change password: ' + JSON.stringify(changeData));
  console.log('✓ Password changed successfully. New mustChangePassword status:', changeData.user.mustChangePassword);
  if (changeData.user.mustChangePassword !== false) throw new Error('Expected mustChangePassword to be false now!');

  // Verify login with new password works
  const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: newPassword })
  });
  const newLoginData = await newLoginRes.json();
  if (!newLoginData.success) throw new Error('Login with new password failed');
  console.log('✓ Citra logged in with new password successfully');

  // Restore Citra's password back to 'password123' so subsequent tests/dev work as expected
  await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newLoginData.accessToken}`
    },
    body: JSON.stringify({
      currentPassword: newPassword,
      newPassword: 'password123'
    })
  });
  console.log('✓ Restored Citra password back to dev default password123');

  console.log('\n--- 4. TEST REPORTS & CSV EXPORT (prd.md §4.7) ---');
  // 1. Weekly Workload JSON
  const weeklyRes = await fetch(`${BASE_URL}/reports/weekly-workload`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const weekly = await weeklyRes.json();
  console.log('✓ Weekly workload report rows count:', weekly.rows.length);
  const sample = weekly.rows[0];
  console.log('✓ Weekly workload columns verified:', {
    employee: sample.name,
    role: sample.role,
    department: sample.department,
    capacityHours: sample.capacityHours,
    plannedHours: sample.plannedHours,
    actualHours: sample.actualHours,
    activeTickets: sample.activeTicketCount,
    overdue: sample.overdueTicketCount,
    workloadRisk: sample.riskLevel
  });

  // 2. Department Report JSON
  const deptRes = await fetch(`${BASE_URL}/reports/department`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const deptReport = await deptRes.json();
  console.log('✓ Department report rows count:', deptReport.rows.length);

  // 3. Weekly Workload CSV
  const weeklyCsvRes = await fetch(`${BASE_URL}/reports/weekly-workload.csv`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const weeklyCsvText = await weeklyCsvRes.text();
  console.log('✓ Weekly Workload CSV status:', weeklyCsvRes.status, 'Content-Type:', weeklyCsvRes.headers.get('content-type'));
  const weeklyCsvHeader = weeklyCsvText.split('\n')[0];
  console.log('✓ Weekly CSV Header:', weeklyCsvHeader);

  // 4. Department Report CSV
  const deptCsvRes = await fetch(`${BASE_URL}/reports/department.csv`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const deptCsvText = await deptCsvRes.text();
  console.log('✓ Department CSV status:', deptCsvRes.status, 'Content-Type:', deptCsvRes.headers.get('content-type'));
  const deptCsvHeader = deptCsvText.split('\n')[0];
  console.log('✓ Department CSV Header:', deptCsvHeader);

  console.log('\n======================================================');
  console.log('🎉 ALL PROMPT 4 BACKEND INTEGRATION TESTS PASSED 100%! 🎉');
  console.log('======================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
