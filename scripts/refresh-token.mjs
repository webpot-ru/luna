import fs from 'node:fs';
import path from 'node:path';

const clientFile = 'c:/Users/ramil/Desktop/luna/.secrets/google-oauth-client.json';
const tokenFile = 'c:/Users/ramil/Desktop/luna/.secrets/google-oauth-token.json';

async function refresh() {
  const clientData = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
  const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));

  const clientInfo = clientData.installed || clientData.web;
  if (!clientInfo) {
    throw new Error('Invalid client file structure');
  }

  const { client_id, client_secret, token_uri } = clientInfo;
  const { refresh_token } = tokenData;

  if (!refresh_token) {
    throw new Error('No refresh token found in token file');
  }

  console.log('Refreshing Google API OAuth token...');
  const response = await fetch(token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id,
      client_secret,
      refresh_token
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  
  tokenData.access_token = data.access_token;
  tokenData.expires_in = data.expires_in;
  tokenData.expires_at = Date.now() + data.expires_in * 1000;
  
  fs.writeFileSync(tokenFile, JSON.stringify(tokenData, null, 2), 'utf8');
  console.log('Access token successfully refreshed and saved!');
}

refresh().catch(console.error);
