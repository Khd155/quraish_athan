const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // إجبار التحميل داخل مجلد المشروع لتجنب مشاكل الصلاحيات في /root/
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
