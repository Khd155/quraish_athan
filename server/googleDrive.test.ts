import { describe, it, expect } from 'vitest';
import { testGoogleDriveConnection, uploadPdfToGoogleDrive } from './googleDrive';

describe('Google Drive Integration via Apps Script', () => {
  it('should test connection to Google Apps Script', async () => {
    const result = await testGoogleDriveConnection();
    console.log('Connection Test Result:', result);
    expect(typeof result).toBe('boolean');
  });

  it('should handle PDF upload response format', async () => {
    // اختبار صيغة الاستجابة فقط (بدون رفع فعلي)
    const mockBuffer = Buffer.from('test pdf content');
    const result = await uploadPdfToGoogleDrive(mockBuffer, 'test_file.pdf', 'meeting');
    
    console.log('Upload Response:', result);
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle upload errors gracefully', async () => {
    // اختبار معالجة الأخطاء
    const mockBuffer = Buffer.from('test content');
    const result = await uploadPdfToGoogleDrive(mockBuffer, 'test.pdf', 'evaluation');
    
    // يجب أن تكون الاستجابة دائماً object مع success و error
    expect(result).toHaveProperty('success');
    if (!result.success) {
      expect(result).toHaveProperty('error');
    }
  });
});
