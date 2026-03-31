import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

// الحصول على المسار الحالي في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// بيانات OAuth 2.0
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const OAUTH_REDIRECT_URL = 'http://localhost:3000/api/oauth/google-drive-callback';

// مسار حفظ tokens
const TOKENS_PATH = path.join(__dirname, 'google-drive-tokens.json');

// Folder ID في Google Drive
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1Ev7FIi0Z7InXg-EHh8KHAuDm1pyLBR44';

let oauthClient: OAuth2Client | null = null;

/**
 * إنشاء عميل OAuth 2.0
 */
function getOAuthClient(): OAuth2Client {
  if (oauthClient) return oauthClient;

  oauthClient = new OAuth2Client(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URL
  );

  // تحميل tokens المحفوظة إن وجدت
  if (fs.existsSync(TOKENS_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
      oauthClient.setCredentials(tokens);
      console.log('✅ تم تحميل OAuth tokens من الملف');
    } catch (error) {
      console.error('❌ خطأ في تحميل OAuth tokens:', error);
    }
  }

  return oauthClient;
}

/**
 * الحصول على رابط المصادقة
 */
export function getAuthorizationUrl(): string {
  const client = getOAuthClient();
  const scopes = ['https://www.googleapis.com/auth/drive.file'];
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return authUrl;
}

/**
 * معالجة رمز المصادقة وحفظ tokens
 */
export async function handleAuthorizationCode(code: string): Promise<boolean> {
  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    
    client.setCredentials(tokens);
    
    // حفظ tokens في ملف
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ تم حفظ OAuth tokens بنجاح');
    
    return true;
  } catch (error) {
    console.error('❌ خطأ في معالجة رمز المصادقة:', error);
    return false;
  }
}

/**
 * التحقق من وجود tokens صحيحة
 */
export async function hasValidTokens(): Promise<boolean> {
  try {
    if (!fs.existsSync(TOKENS_PATH)) {
      return false;
    }

    const client = getOAuthClient();
    const credentials = client.credentials;
    
    if (!credentials.access_token) {
      return false;
    }

    // اختبار الاتصال
    const drive = google.drive({ version: 'v3', auth: client });
    await drive.files.get({
      fileId: DRIVE_FOLDER_ID,
      fields: 'id',
    });

    return true;
  } catch (error) {
    console.error('❌ tokens غير صحيحة أو منتهية الصلاحية:', error);
    return false;
  }
}

/**
 * رفع ملف PDF إلى Google Drive
 * @param fileName - اسم الملف
 * @param pdfBuffer - محتوى ملف PDF (Buffer)
 * @param fileType - نوع الملف (meeting أو evaluation)
 * @returns معرّف الملف في Google Drive
 */
export async function uploadPdfToGoogleDrive(
  fileName: string,
  pdfBuffer: Buffer,
  fileType: 'meeting' | 'evaluation'
): Promise<string | null> {
  try {
    // التحقق من وجود tokens صحيحة
    const hasTokens = await hasValidTokens();
    if (!hasTokens) {
      console.warn('⚠️ لا توجد OAuth tokens صحيحة. يرجى المصادقة أولاً.');
      return null;
    }

    const client = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth: client });

    // إنشاء مجلد فرعي حسب نوع الملف إذا لم يكن موجوداً
    const subFolderName = fileType === 'meeting' ? 'محاضر الاجتماعات' : 'تقارير التقييم';
    let subFolderId = await getOrCreateSubFolder(drive, DRIVE_FOLDER_ID, subFolderName);

    // رفع الملف باستخدام MediaIoBaseUpload
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [subFolderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: Readable.from(pdfBuffer),
      },
      fields: 'id, webViewLink',
    });

    console.log(`✅ تم رفع الملف إلى Google Drive: ${fileName} (ID: ${response.data.id})`);
    console.log(`   الرابط: ${response.data.webViewLink}`);
    
    return response.data.id || null;
  } catch (error: any) {
    console.error(`❌ خطأ في رفع الملف إلى Google Drive:`, {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    return null;
  }
}

/**
 * الحصول على مجلد فرعي أو إنشاؤه إذا لم يكن موجوداً
 */
async function getOrCreateSubFolder(drive: any, parentFolderId: string, folderName: string): Promise<string> {
  try {
    // البحث عن المجلد
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id)',
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // إنشاء المجلد إذا لم يكن موجوداً
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
    });

    console.log(`✅ تم إنشاء مجلد جديد: ${folderName}`);
    return createResponse.data.id;
  } catch (error: any) {
    console.error(`❌ خطأ في إنشاء/الحصول على المجلد:`, {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    throw error;
  }
}

/**
 * اختبار الاتصال بـ Google Drive
 */
export async function testGoogleDriveConnection(): Promise<boolean> {
  try {
    const hasTokens = await hasValidTokens();
    if (!hasTokens) {
      console.warn('⚠️ لا توجد OAuth tokens صحيحة');
      return false;
    }

    const client = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth: client });

    // محاولة الوصول إلى المجلد الرئيسي
    const response = await drive.files.get({
      fileId: DRIVE_FOLDER_ID,
      fields: 'id, name',
    });

    console.log(`✅ اتصال Google Drive ناجح - المجلد: ${response.data.name}`);
    return true;
  } catch (error: any) {
    console.error(`❌ فشل الاتصال بـ Google Drive:`, {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    return false;
  }
}

/**
 * قائمة بالمجلدات المتاحة
 */
export async function listAvailableFolders(): Promise<any[]> {
  try {
    const hasTokens = await hasValidTokens();
    if (!hasTokens) {
      console.warn('⚠️ لا توجد OAuth tokens صحيحة');
      return [];
    }

    const client = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth: client });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 10,
    });

    return response.data.files || [];
  } catch (error) {
    console.error('❌ خطأ في قائمة المجلدات:', error);
    return [];
  }
}
