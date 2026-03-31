import { describe, it, expect } from 'vitest';
import { testGoogleDriveConnection, listAvailableFolders, hasValidTokens } from './googleDrive';

describe('Google Drive OAuth Integration', () => {
  it('should check for valid OAuth tokens', async () => {
    const hasTokens = await hasValidTokens();
    console.log('Has Valid Tokens:', hasTokens);
    expect(typeof hasTokens).toBe('boolean');
  });

  it('should list available folders', async () => {
    const folders = await listAvailableFolders();
    console.log('Available Folders:', folders);
    expect(Array.isArray(folders)).toBe(true);
  });

  it('should test Google Drive connection', async () => {
    const result = await testGoogleDriveConnection();
    console.log('Google Drive Connection Test:', result);
    expect(typeof result).toBe('boolean');
  });
});
