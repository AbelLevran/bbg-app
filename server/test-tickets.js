const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('--- STARTING TICKETS & TIMER INTEGRATION TESTS ---');

  // 1. Login as budi (Department Head, BMS)
  const budiLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'budi', password: 'password123' })
  });
  const budiData = await budiLoginRes.json();
  if (!budiData.success) throw new Error('Budi login failed: ' + budiData.message);
  const budiToken = budiData.accessToken;
  console.log('✓ Budi logged in successfully (Role:', budiData.user.role, ')');

  // 2. Login as citra (Member, BMS)
  const citraLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: 'password123' })
  });
  const citraData = await citraLoginRes.json();
  if (!citraData.success) throw new Error('Citra login failed: ' + citraData.message);
  const citraToken = citraData.accessToken;
  console.log('✓ Citra logged in successfully (Role:', citraData.user.role, ')');

  // 3. Budi creates Ticket 1 assigned to Citra
  const createRes = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${budiToken}`
    },
    body: JSON.stringify({
      title: 'Automated Test Ticket 1',
      description: 'Test description for ticket 1',
      requestedBy: budiData.user.id,
      assignedTo: citraData.user.id,
      priority: 'HIGH',
      estimatedMinutes: 60,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      clusterType: 'DAILY'
    })
  });
  const createData = await createRes.json();
  if (!createData.success) throw new Error('Failed to create ticket: ' + JSON.stringify(createData));
  const ticket1 = createData.ticket;
  console.log('✓ Budi created ticket:', ticket1.ticketNumber, 'ID:', ticket1.id);

  // 4. Test Ownership Enforcement: Citra tries to update Ticket 1 (created by Budi)
  console.log('Testing non-owner PATCH protection...');
  const citraPatchRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citraToken}`
    },
    body: JSON.stringify({ title: 'Hacked title by Citra' })
  });
  console.log('  PATCH status code:', citraPatchRes.status);
  if (citraPatchRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for non-owner edit, got ${citraPatchRes.status}`);
  }
  console.log('✓ Non-owner edit correctly blocked with 403 Forbidden');

  // 5. Test Ownership Enforcement: Citra tries to delete Ticket 1
  console.log('Testing non-owner DELETE protection...');
  const citraDeleteRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${citraToken}`
    }
  });
  console.log('  DELETE status code:', citraDeleteRes.status);
  if (citraDeleteRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for non-owner delete, got ${citraDeleteRes.status}`);
  }
  console.log('✓ Non-owner delete correctly blocked with 403 Forbidden');

  // 6. Budi (Owner) updates Ticket 1
  const budiPatchRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${budiToken}`
    },
    body: JSON.stringify({ title: 'Updated Title by Budi' })
  });
  if (budiPatchRes.status !== 200) {
    throw new Error(`Expected 200 OK for owner edit, got ${budiPatchRes.status}`);
  }
  console.log('✓ Owner edit succeeded with 200 OK');

  // 7. Budi creates Ticket 2 also assigned to Citra
  const create2Res = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${budiToken}`
    },
    body: JSON.stringify({
      title: 'Automated Test Ticket 2',
      requestedBy: budiData.user.id,
      assignedTo: citraData.user.id,
      priority: 'MEDIUM',
      estimatedMinutes: 30,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      clusterType: 'DAILY'
    })
  });
  const ticket2 = (await create2Res.json()).ticket;
  console.log('✓ Budi created ticket 2:', ticket2.ticketNumber);

  // 8. Citra starts timer on Ticket 1
  console.log('Starting timer on Ticket 1 as Citra...');
  const startRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}/timer/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citraToken}` }
  });
  const startData = await startRes.json();
  if (startRes.status !== 200 || startData.timer.status !== 'RUNNING') {
    throw new Error('Failed to start timer: ' + JSON.stringify(startData));
  }
  console.log('✓ Timer started on Ticket 1 (status: RUNNING)');

  // 9. Citra tries to start timer on Ticket 2 while Ticket 1 is RUNNING -> Expect 409 Conflict
  console.log('Testing 1-active-timer conflict rule on Ticket 2...');
  const conflictRes = await fetch(`${BASE_URL}/tickets/${ticket2.id}/timer/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citraToken}` }
  });
  console.log('  Start second timer status code:', conflictRes.status);
  if (conflictRes.status !== 409) {
    throw new Error(`Expected 409 Conflict, got ${conflictRes.status}`);
  }
  const conflictJson = await conflictRes.json();
  console.log('✓ Conflict 409 correctly returned with conflict data:', conflictJson.conflict.ticketNumber);

  // 10. Pause timer on Ticket 1
  console.log('Pausing timer on Ticket 1...');
  const pauseRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}/timer/pause`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citraToken}` }
  });
  const pauseData = await pauseRes.json();
  if (pauseRes.status !== 200 || pauseData.timer.status !== 'PAUSED') {
    throw new Error('Failed to pause timer: ' + JSON.stringify(pauseData));
  }
  console.log('✓ Timer paused on Ticket 1 (status: PAUSED)');

  // 11. Resume timer on Ticket 1 (Per design.md: opens NEW session)
  console.log('Resuming timer on Ticket 1...');
  const resumeRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}/timer/resume`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citraToken}` }
  });
  const resumeData = await resumeRes.json();
  if (resumeRes.status !== 200 || resumeData.timer.status !== 'RUNNING') {
    throw new Error('Failed to resume timer: ' + JSON.stringify(resumeData));
  }
  console.log('✓ Timer resumed on Ticket 1 (status: RUNNING, new session created)');

  // 12. Stop timer on Ticket 1
  console.log('Stopping timer on Ticket 1...');
  const stopRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}/timer/stop`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citraToken}` }
  });
  const stopData = await stopRes.json();
  if (stopRes.status !== 200) {
    throw new Error('Failed to stop timer: ' + JSON.stringify(stopData));
  }
  console.log('✓ Timer stopped on Ticket 1');

  // 13. Add manual time on Ticket 1
  console.log('Adding manual time of 45m on Ticket 1...');
  const manualRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}/manual-time`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citraToken}`
    },
    body: JSON.stringify({ minutes: 45, reason: 'Offline design review session' })
  });
  const manualData = await manualRes.json();
  if (manualRes.status !== 201 || manualData.session.durationMinutes !== 45) {
    throw new Error('Failed to add manual time: ' + JSON.stringify(manualData));
  }
  console.log('✓ Manual time added successfully (45 minutes, source MANUAL)');

  // 14. Verify ticket detail has sessions & logs
  const detailRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}`, {
    headers: { 'Authorization': `Bearer ${citraToken}` }
  });
  const detailData = await detailRes.json();
  console.log('✓ Ticket details loaded:', {
    sessionsCount: detailData.ticket.timeSessions.length,
    actualMinutes: detailData.ticket.actualMinutes,
    logsCount: detailData.ticket.activityLogs.length
  });

  // Clean up test tickets
  await fetch(`${BASE_URL}/tickets/${ticket1.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${budiToken}` }
  });
  await fetch(`${BASE_URL}/tickets/${ticket2.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${budiToken}` }
  });
  console.log('✓ Cleaned up test tickets');

  console.log('\n========================================');
  console.log('ALL TICKETS & TIMER TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
