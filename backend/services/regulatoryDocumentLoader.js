const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * שירות לטעינת המסמך הרגולטורי
 * טוען את המסמך מ-regulatory_requirements ומעבד אותו
 */
class RegulatoryDocumentLoader {
  constructor() {
    this.documentPath = path.join(__dirname, '../../regoulotory_requierments');
    this.jsonDbPath = path.join(__dirname, '../../data/requirements_from_pdf.json');
    this.cachedText = null;
    this.lastModified = null;
  }

  /**
   * טוען את המסמך הרגולטורי
   * @param {string} format - 'pdf' או 'docx'
   * @returns {string} טקסט המסמך
   */
  async loadDocument(format = 'pdf') {
    try {
      // עדיפות: שימוש בבסיס הנתונים שהופק מה-PDF
      const useJsonDb = await this.isJsonDbAvailable();
      if (useJsonDb) {
        const { text, modifiedAt } = await this.loadFromJsonDb();
        // cache לפי זמן שינוי קובץ ה-JSON
        if (this.cachedText && this.lastModified && modifiedAt <= this.lastModified) {
          console.log('📋 משתמש בטקסט מהמטמון (JSON)');
          return this.cachedText;
        }
        this.cachedText = text;
        this.lastModified = modifiedAt;
        console.log(`✅ נטען טקסט מדרישות JSON: ${text.length} תווים`);
        return text;
      }

      // Fallback: טעינת קובץ מקור (PDF/Word)
      const fileName = format === 'pdf' ? '18-07-2022_4.2A.pdf' : '18-07-2022_4.2A.docx';
      const filePath = path.join(this.documentPath, fileName);

      console.log(`📄 טוען מסמך רגולטורי מהמקור: ${fileName}`);

      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`הקובץ ${fileName} לא נמצא בתיקייה ${this.documentPath}`);
      }

      const stats = await fs.stat(filePath);
      const currentModified = stats.mtime;

      if (this.cachedText && this.lastModified && currentModified <= this.lastModified) {
        console.log('📋 משתמש בטקסט מהמטמון');
        return this.cachedText;
      }

      let text = '';
      if (format === 'pdf') {
        text = await this.extractFromPDF(filePath);
      } else if (format === 'docx') {
        text = await this.extractFromWord(filePath);
      } else {
        throw new Error('פורמט לא נתמך. השתמש ב-pdf או docx');
      }

      this.cachedText = text;
      this.lastModified = currentModified;
      console.log(`✅ מסמך נטען בהצלחה: ${text.length} תווים`);
      return text;

    } catch (error) {
      console.error('❌ שגיאה בטעינת מסמך:', error);
      throw error;
    }
  }

  /**
   * בודק זמינות של בסיס נתונים JSON מחולץ
   */
  async isJsonDbAvailable() {
    try {
      await fs.access(this.jsonDbPath);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * טוען דרישות מ-JSON ומייצר מחרוזת טקסט רציפה לשימוש המחולץ הנוכחי
   * מחזיר גם זמן שינוי קובץ לצורך cache
   */
  async loadFromJsonDb() {
    const stats = await fs.stat(this.jsonDbPath);
    const raw = await fs.readFile(this.jsonDbPath, 'utf8');
    let items = [];
    try {
      items = JSON.parse(raw);
    } catch (e) {
      throw new Error('קובץ ה-JSON של הדרישות לא תקין');
    }

    // הרכבת טקסט אחיד: כותרת + תיאור + קטגוריה/עדיפות כדי לשמר הקשרים ש-RequirementsExtractor מזהה
    const parts = [];
    for (const item of items) {
      const title = (item.title || '').toString().trim();
      const desc = (item.description || '').toString().trim();
      const category = (item.category || '').toString().trim();
      const priority = (item.priority || '').toString().trim();
      if (!title && !desc) continue;
      const header = title ? `◼︎ ${title}` : '';
      const body = desc ? ` ${desc}` : '';
      const meta = [category, priority].filter(Boolean).join(' | ');
      parts.push([header, body, meta ? ` (${meta})` : ''].join(''));
    }

    const text = parts.join('\n');
    return { text, modifiedAt: stats.mtime };
  }

  /**
   * מחלץ טקסט מקובץ PDF
   * @param {string} filePath - נתיב הקובץ
   * @returns {string} טקסט מחולץ
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } catch (error) {
      throw new Error(`שגיאה בחילוץ טקסט מ-PDF: ${error.message}`);
    }
  }

  /**
   * מחלץ טקסט מקובץ Word
   * @param {string} filePath - נתיב הקובץ
   * @returns {string} טקסט מחולץ
   */
  async extractFromWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`שגיאה בחילוץ טקסט מ-Word: ${error.message}`);
    }
  }

  /**
   * מחזיר מידע על המסמכים הזמינים
   * @returns {Object} מידע על המסמכים
   */
  async getDocumentInfo() {
    try {
      const files = await fs.readdir(this.documentPath);
      const documentFiles = files.filter(file => 
        file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.doc')
      );

      const documentInfo = [];
      
      for (const file of documentFiles) {
        const filePath = path.join(this.documentPath, file);
        const stats = await fs.stat(filePath);
        
        documentInfo.push({
          name: file,
          size: stats.size,
          modified: stats.mtime,
          format: path.extname(file).toLowerCase()
        });
      }

      return {
        success: true,
        documents: documentInfo,
        path: this.documentPath
      };

    } catch (error) {
      console.error('❌ שגיאה בקבלת מידע על מסמכים:', error);
      return {
        success: false,
        error: error.message,
        documents: []
      };
    }
  }

  /**
   * בודק אם המסמך נטען במטמון
   * @returns {boolean} האם נטען במטמון
   */
  isCached() {
    return this.cachedText !== null;
  }

  /**
   * מנקה את המטמון
   */
  clearCache() {
    this.cachedText = null;
    this.lastModified = null;
    console.log('🗑️ מטמון המסמך נוקה');
  }

  /**
   * מחזיר סטטיסטיקות על המסמך
   * @returns {Object} סטטיסטיקות
   */
  getDocumentStats() {
    if (!this.cachedText) {
      return {
        loaded: false,
        message: 'מסמך לא נטען'
      };
    }

    const text = this.cachedText;
    const lines = text.split('\n').length;
    const words = text.split(/\s+/).length;
    const characters = text.length;

    // חיפוש דפוסים נפוצים
    const patterns = {
      chapters: (text.match(/פרק\s+\d+/g) || []).length,
      sections: (text.match(/\d+\.\d+/g) || []).length,
      requirements: (text.match(/חובה|נדרש|יש להתקין/g) || []).length,
      size_mentions: (text.match(/\d+\s*מ"ר/g) || []).length,
      occupancy_mentions: (text.match(/\d+\s*מקומות?\s*ישיבה/g) || []).length
    };

    return {
      loaded: true,
      lastModified: this.lastModified,
      stats: {
        lines,
        words,
        characters,
        patterns
      }
    };
  }
}

module.exports = new RegulatoryDocumentLoader();
