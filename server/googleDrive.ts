import axios from 'axios';

// رابط Google Apps Script الذي تم إعداده مسبقاً
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzo-Q_KO2E3E2DF6WD9_Q9FLELAbZqkVMTcmIIZ0vb_7JV1NM_0FvT8E9duVAUIMpt/exec';

// Folder ID في Google Drive
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1Ev7FIi0Z7InXg-EHh8KHAuDm1pyLBR44';

/**
 * رفع ملف PDF إلى Google Drive عبر Google Apps Script
 * @param pdfBuffer - محتوى ملف PDF (Buffer)
 * @param fileName - اسم الملف
 * @param fileType - نوع الملف (meeting أو evaluation)
 * @returns معرّف الملف أو رابط الملف
 */
export async function uploadPdfToGoogleDrive(
  pdfBuffer: Buffer,
  fileName: string,
  fileType: 'meeting' | 'evaluation'
): Promise<{ success: boolean; fileId?: string; fileUrl?: string; error?: string }> {
  try {
    // تحويل Buffer إلى Base64
    const encodedString = pdfBuffer.toString('base64');

    // إنشاء اسم مجلد فرعي حسب نوع الملف
    const subFolderName = fileType === 'meeting' ? 'محاضر الاجتماعات' : 'تقارير التقييم';

    // إرسال الملف إلى Google Apps Script
    const payload = {
      fileName: fileName,
      fileContent: encodedString,
      subFolder: subFolderName,
      parentFolderId: DRIVE_FOLDER_ID,
    };

    console.log(`📤 جاري رفع الملف: ${fileName} إلى Google Drive عبر Apps Script...`);

    const response = await axios.post(APPS_SCRIPT_URL, payload, {
      timeout: 30000, // timeout 30 ثانية
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      console.log(`✅ تم رفع الملف بنجاح: ${fileName}`);
      console.log(`   معرّف الملف: ${response.data.fileId}`);
      console.log(`   رابط الملف: ${response.data.fileUrl}`);
      
      return {
        success: true,
        fileId: response.data.fileId,
        fileUrl: response.data.fileUrl,
      };
    } else {
      console.error(`❌ فشل الرفع: ${response.data.error}`);
      return {
        success: false,
        error: response.data.error || 'فشل الرفع إلى Google Drive',
      };
    }
  } catch (error: any) {
    console.error(`❌ خطأ في رفع الملف إلى Google Drive:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    return {
      success: false,
      error: error.message || 'خطأ في الاتصال بـ Google Apps Script',
    };
  }
}

/**
 * اختبار الاتصال بـ Google Apps Script
 */
export async function testGoogleDriveConnection(): Promise<boolean> {
  try {
    console.log('🔍 اختبار الاتصال بـ Google Apps Script...');

    const response = await axios.post(
      APPS_SCRIPT_URL,
      { test: true },
      { timeout: 10000 }
    );

    if (response.data.success) {
      console.log('✅ الاتصال بـ Google Apps Script ناجح');
      return true;
    } else {
      console.error('❌ فشل الاتصال:', response.data.error);
      return false;
    }
  } catch (error: any) {
    console.error('❌ خطأ في اختبار الاتصال:', error.message);
    return false;
  }
}

/**
 * دالة مساعدة للرفع المباشر (للاستخدام في pdfGenerator)
 */
export async function uploadPdfDirectly(
  pdfBuffer: Buffer,
  fileName: string,
  fileType: 'meeting' | 'evaluation'
): Promise<void> {
  try {
    const result = await uploadPdfToGoogleDrive(pdfBuffer, fileName, fileType);
    
    if (!result.success) {
      console.warn(`⚠️ تحذير: فشل رفع ${fileName} إلى Google Drive: ${result.error}`);
      // لا نرمي خطأ هنا - نسمح للعملية بالاستمرار حتى لو فشل الرفع
    }
  } catch (error) {
    console.error(`⚠️ خطأ غير متوقع في رفع ${fileName}:`, error);
    // لا نرمي خطأ - العملية تستمر
  }
}
