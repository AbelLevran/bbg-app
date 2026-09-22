async function testAuth() {
  console.log('--- Testing BBG Auth Endpoints ---');

  // 1. Invalid login
  const invalidRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ahmad', password: 'wrongpassword' })
  });
  console.log('1. Invalid login status:', invalidRes.status, '(expected 401)');

  // 2. Successful login as ahmad (HEAD_GROUP)
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ahmad', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const cookies = loginRes.headers.get('set-cookie');
  console.log('2. Login as ahmad status:', loginRes.status, 'User role:', loginData.user?.role);
  console.log('   Set-Cookie received:', !!cookies);

  // 3. GET /auth/me with Bearer token
  const meRes = await fetch('http://localhost:4000/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${loginData.accessToken}` }
  });
  const meData = await meRes.json();
  console.log('3. GET /auth/me status:', meRes.status, 'Username:', meData.user?.username);

  // 4. POST /auth/refresh using Cookie
  const refreshRes = await fetch('http://localhost:4000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { Cookie: cookies }
  });
  const refreshData = await refreshRes.json();
  console.log('4. POST /auth/refresh status:', refreshRes.status, 'New token exists:', !!refreshData.accessToken);

  // 5. Login as citra (MEMBER) to test reset password permissions
  const citraLogin = await (await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: 'password123' })
  })).json();

  // Try reset password as MEMBER (should be 403)
  const forbiddenReset = await fetch(`http://localhost:4000/api/v1/users/${citraLogin.user.id}/reset-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${citraLogin.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('5. Member attempting reset-password status:', forbiddenReset.status, '(expected 403)');

  // Admin (ahmad - HEAD_GROUP) resetting citra's password (should succeed 200)
  const adminReset = await fetch(`http://localhost:4000/api/v1/users/${citraLogin.user.id}/reset-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginData.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const adminResetData = await adminReset.json();
  console.log('6. Head Group resetting citra password status:', adminReset.status, 'Temp pass generated:', !!adminResetData.temporaryPassword);

  // Reset citra password back to password123 with seed script or test login with temporary password
  const tempLoginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'citra', password: adminResetData.temporaryPassword })
  });
  const tempLoginData = await tempLoginRes.json();
  console.log('7. Citra login with temporary password status:', tempLoginRes.status, 'mustChangePassword:', tempLoginData.user?.mustChangePassword);

  // 8. Logout
  const logoutRes = await fetch('http://localhost:4000/api/v1/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookies }
  });
  console.log('8. Logout status:', logoutRes.status, '(expected 200)');

  console.log('--- Auth Endpoints Test Complete ---');
}

testAuth().catch(console.error);
