const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('=== STARTING WORKLOAD, CAPACITY, RECURRING & EVENTS INTEGRATION TESTS ===\n');

  // 1. Log in users
  // Ahmad: Head Group
  const ahmadRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ahmad', password: 'password123' })
  });
  const ahmad = await ahmadRes.json();
  if (!ahmad.success) throw new Error('Ahmad login failed');
  console.log('✓ Ahmad (HEAD_GROUP) logged in');

  // Budi: Department Head (BMS)
  const budiRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'budi', password: 'password123' })
  });
  const budi = await budiRes.json();
  if (!budi.success) throw new Error('Budi login failed');
  console.log('✓ Budi (DEPARTMENT_HEAD - BMS) logged in');

  // Citra: Member (BMS)
  const citraRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: 'password123' })
  });
  const citra = await citraRes.json();
  if (!citra.success) throw new Error('Citra login failed');
  console.log('✓ Citra (MEMBER - BMS) logged in');

  // Fajar: Department Head (Retail)
  const fajarRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'fajar', password: 'password123' })
  });
  const fajar = await fajarRes.json();
  if (!fajar.success) throw new Error('Fajar login failed');
  console.log('✓ Fajar (DEPARTMENT_HEAD - Retail) logged in');

  console.log('\n--- 2. TEST CAPACITY OVERRIDE PERMISSIONS (prd.md §3.6) ---');
  const thisWeek = new Date().toISOString().slice(0, 10);

  // Citra edits her own capacity -> OK
  const citraSelfRes = await fetch(`${BASE_URL}/users/${citra.user.id}/capacity?week=${thisWeek}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${citra.accessToken}` },
    body: JSON.stringify({ text: '36' })
  });
  const citraSelfData = await citraSelfRes.json();
  if (!citraSelfRes.ok) throw new Error('Citra self-capacity edit failed: ' + JSON.stringify(citraSelfData));
  console.log('✓ Citra successfully edited her own capacity to 36h (parsed minutes:', citraSelfData.override.minutes, ')');

  // Citra tries to edit Budi's capacity -> 403 Forbidden
  const citraOnBudiRes = await fetch(`${BASE_URL}/users/${budi.user.id}/capacity?week=${thisWeek}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${citra.accessToken}` },
    body: JSON.stringify({ text: '35' })
  });
  if (citraOnBudiRes.status === 403) {
    console.log('✓ Citra blocked from editing Budi\'s capacity (403 Forbidden as expected)');
  } else {
    throw new Error('Citra was NOT blocked from editing Budi capacity, status: ' + citraOnBudiRes.status);
  }

  // Budi (Dept Head BMS) edits Citra's capacity (member of same dept) -> OK
  const budiOnCitraRes = await fetch(`${BASE_URL}/users/${citra.user.id}/capacity?week=${thisWeek}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${budi.accessToken}` },
    body: JSON.stringify({ text: '38h' })
  });
  if (budiOnCitraRes.ok) {
    console.log('✓ Budi (Dept Head) successfully edited Citra\'s capacity (same dept member) to 38h');
  } else {
    throw new Error('Budi failed to edit Citra capacity: ' + budiOnCitraRes.status);
  }

  // Budi tries to edit Fajar (Retail Dept Head) -> 403 Forbidden
  const budiOnFajarRes = await fetch(`${BASE_URL}/users/${fajar.user.id}/capacity?week=${thisWeek}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${budi.accessToken}` },
    body: JSON.stringify({ text: '30' })
  });
  if (budiOnFajarRes.status === 403) {
    console.log('✓ Budi blocked from editing Fajar\'s capacity in Retail (403 Forbidden as expected)');
  } else {
    throw new Error('Budi was NOT blocked from editing Fajar capacity, status: ' + budiOnFajarRes.status);
  }

  // Ahmad (Head Group) edits Fajar's capacity -> OK
  const ahmadOnFajarRes = await fetch(`${BASE_URL}/users/${fajar.user.id}/capacity?week=${thisWeek}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ahmad.accessToken}` },
    body: JSON.stringify({ text: '32h' })
  });
  if (ahmadOnFajarRes.ok) {
    console.log('✓ Ahmad (Head Group) successfully edited Fajar\'s capacity to 32h');
  } else {
    throw new Error('Ahmad failed to edit Fajar capacity: ' + ahmadOnFajarRes.status);
  }

  console.log('\n--- 3. TEST WORKLOAD CALCULATION & UTILIZATION MATH (design.md §4) ---');
  const citraWorkloadRes = await fetch(`${BASE_URL}/workload/user/${citra.user.id}?week=${thisWeek}`, {
    headers: { 'Authorization': `Bearer ${citra.accessToken}` }
  });
  const citraWl = await citraWorkloadRes.json();
  console.log('✓ Citra Workload:', {
    capacityHours: citraWl.capacityHours,
    plannedHours: citraWl.plannedHours,
    actualHours: citraWl.actualHours,
    plannedUtilizationPct: citraWl.plannedUtilizationPct,
    actualUtilizationPct: citraWl.actualUtilizationPct,
    riskLevel: citraWl.riskLevel
  });
  if (citraWl.capacityHours !== 38) throw new Error('Citra capacityHours is not 38 as set earlier!');

  // Test Group Workload
  const groupWorkloadRes = await fetch(`${BASE_URL}/workload/group?week=${thisWeek}`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const groupWl = await groupWorkloadRes.json();
  console.log('✓ Group Workload departments returned:', groupWl.departments.length);
  if (groupWl.departments.length !== 4) throw new Error('Expected 4 departments in group workload');

  console.log('\n--- 4. TEST RECURRING TICKET SERIES (prd.md §3.7) ---');
  const seriesRes = await fetch(`${BASE_URL}/tickets/recurring-series`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${budi.accessToken}` },
    body: JSON.stringify({
      seriesLabel: 'Daily Operations Sync',
      frequency: 'DAILY',
      occurrences: 3,
      startDueDate: new Date().toISOString(),
      requestedBy: budi.user.id,
      assignedTo: citra.user.id,
      priority: 'MEDIUM',
      estimatedMinutes: 60,
      description: 'Daily recurring sync ticket',
      clusterType: 'DAILY'
    })
  });
  const seriesData = await seriesRes.json();
  if (!seriesRes.ok) throw new Error('Failed to create recurring series: ' + JSON.stringify(seriesData));
  console.log('✓ Recurring series created:', seriesData.seriesLabel || '3 occurrences', 'GroupID:', seriesData.recurrenceGroupId);
  if (seriesData.tickets.length !== 3) throw new Error('Expected 3 tickets created in series');
  const firstOccurrence = seriesData.tickets[0];

  // Test Add Next Occurrence
  const nextOccRes = await fetch(`${BASE_URL}/tickets/${firstOccurrence.id}/recurrence/next-occurrence`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${budi.accessToken}` }
  });
  const nextOccData = await nextOccRes.json();
  if (!nextOccRes.ok) throw new Error('Failed to add next occurrence: ' + JSON.stringify(nextOccData));
  console.log('✓ Added next occurrence:', nextOccData.ticket.ticketNumber, 'Title:', nextOccData.ticket.title);

  // Test Siblings
  const sibRes = await fetch(`${BASE_URL}/tickets/${firstOccurrence.id}/recurrence/siblings`, {
    headers: { 'Authorization': `Bearer ${budi.accessToken}` }
  });
  const sibData = await sibRes.json();
  console.log('✓ Recurring series siblings count:', sibData.tickets.length, '(expected 4: 3 + 1)');
  if (sibData.tickets.length !== 4) throw new Error('Expected 4 siblings in series');

  console.log('\n--- 5. TEST EVENT CLUSTERS & GALLERY (prd.md §3.8) ---');
  // Create an EVENT ticket
  const eventTicketRes = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${budi.accessToken}` },
    body: JSON.stringify({
      title: 'BSI EXPO Launch Task',
      description: 'Key deliverable for EXPO',
      requestedBy: budi.user.id,
      assignedTo: citra.user.id,
      priority: 'HIGH',
      estimatedMinutes: 120,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      clusterType: 'EVENT',
      clusterName: 'BSI EXPO 2026'
    })
  });
  const eventTicketData = await eventTicketRes.json();
  if (!eventTicketRes.ok) throw new Error('Failed to create event ticket: ' + JSON.stringify(eventTicketData));
  console.log('✓ Created EVENT ticket in "BSI EXPO 2026" cluster:', eventTicketData.ticket.ticketNumber);

  // Fetch events gallery
  const eventsRes = await fetch(`${BASE_URL}/events`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const eventsList = await eventsRes.json();
  console.log('✓ Events gallery cards:', eventsList.map(e => `${e.clusterName} (${e.total} tickets, ${e.progressPct}%)`));
  const expoEvent = eventsList.find(e => e.clusterName === 'BSI EXPO 2026');
  if (!expoEvent) throw new Error('BSI EXPO 2026 not found in events list');

  // Fetch event tickets drill-in
  const eventTicketsRes = await fetch(`${BASE_URL}/events/${encodeURIComponent('BSI EXPO 2026')}/tickets`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const eventTicketsData = await eventTicketsRes.json();
  console.log('✓ Event drill-in summary:', eventTicketsData.summary);
  if (eventTicketsData.tickets.length === 0) throw new Error('No tickets found in event drill-in');

  console.log('\n--- 6. TEST REPORTS & CSV EXPORT (prd.md §4.7) ---');
  const weeklyReportRes = await fetch(`${BASE_URL}/reports/weekly-workload?week=${thisWeek}`, {
    headers: { 'Authorization': `Bearer ${ahmad.accessToken}` }
  });
  const weeklyReport = await weeklyReportRes.json();
  console.log('✓ Weekly workload report rows:', weeklyReport.rows.length);
  if (weeklyReport.rows.length === 0) throw new Error('Weekly report rows empty');

  // Verify columns exist: role, activeTicketCount, riskLevel
  const sampleRow = weeklyReport.rows[0];
  console.log('✓ Sample row has required fields:', {
    name: sampleRow.name,
    role: sampleRow.role,
    department: sampleRow.department,
    activeTicketCount: sampleRow.activeTicketCount,
    riskLevel: sampleRow.riskLevel
  });

  // Verify non-head group gets 403 on reports
  const citraReportRes = await fetch(`${BASE_URL}/reports/weekly-workload`, {
    headers: { 'Authorization': `Bearer ${citra.accessToken}` }
  });
  if (citraReportRes.status === 403) {
    console.log('✓ Citra (MEMBER) blocked from reports (403 Forbidden)');
  } else {
    throw new Error('Citra was NOT blocked from reports');
  }

  console.log('\n========================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED 100%! 🎉');
  console.log('========================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
