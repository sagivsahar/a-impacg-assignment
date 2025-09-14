const OpenAI = require('openai');

class AIReportService {
  constructor() {
    this.openai = null;
    this.initializeOpenAI();
  }

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('✅ OpenAI initialized successfully');
    } else {
      console.log('⚠️ OpenAI API key not found, using fallback report generation');
    }
  }

  /**
   * יוצר דוח AI מקצועי
   * @param {string} businessType - סוג העסק
   * @param {Object} answers - תשובות השאלון
   * @param {Object} requirements - דרישות מחולצות
   * @returns {Object} דוח מקצועי
   */
  async generateReport(businessType, answers, requirements) {
    console.log('\n🚀 ===== התחלת יצירת דוח AI =====');
    // תומכים רק במסעדות כרגע
    const effectiveBusinessType = 'מסעדה';
    console.log(`📊 סוג עסק: ${effectiveBusinessType}`);
    console.log(`📝 מספר תשובות: ${Object.keys(answers).length}`);
    console.log(`📋 מספר קטגוריות דרישות: ${Object.keys(requirements).length}`);
    
    // לוג מפורט של התשובות
    console.log('\n📋 תשובות המשתמש:');
    console.log('=' .repeat(50));
    Object.entries(answers).forEach(([key, value]) => {
      console.log(`${key}: ${JSON.stringify(value)}`);
    });
    console.log('=' .repeat(50));
    
    // לוג מפורט של הדרישות
    console.log('\n📋 דרישות מחולצות:');
    console.log('=' .repeat(50));
    Object.entries(requirements).forEach(([category, reqs]) => {
      console.log(`\nקטגוריה: ${category}`);
      reqs.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.requirement}`);
        console.log(`     ציטוט: ${req.citation}`);
        console.log(`     עדיפות: ${req.priority}`);
      });
    });
    console.log('=' .repeat(50));

    // בונים את הפרומפט תמיד כדי שנוכל להחזיר אותו לפרונט
    const prompt = this.buildPrompt(effectiveBusinessType, answers, requirements);

    // בונים גם את ההודעה המלאה שתישלח ל-ChatGPT לצורך דיבוג ושיקוף לפרונט
    const chatMessage = {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "אתה מומחה לרישוי עסקים בישראל. אתה יוצר דוחות מקצועיים ומסודרים לעסקים."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    };

    if (!this.openai) {
      console.log('⚠️ OpenAI לא זמין, משתמש בדוח גיבוי');
      const fallback = this.generateFallbackReport(effectiveBusinessType, answers, requirements);
      // מצרפים את הפרומפט וההודעה המלאה כדי שהפרונט יציג אותם
      return {
        ...fallback,
        prompt,
        chatMessage,
        generatedBy: 'Fallback System'
      };
    }

    try {
      
      console.log('\n🔄 שולח בקשה ל-ChatGPT...');
      console.log('📤 PROMPT שנשלח ל-ChatGPT:');
      console.log('=' .repeat(80));
      console.log(prompt);
      console.log('=' .repeat(80));
      
      
      // לוג מפורט של ההודעה שנשלחת ל-ChatGPT
      console.log('\n💬 הודעה מלאה שנשלחת ל-ChatGPT:');
      console.log('=' .repeat(80));
      console.log(JSON.stringify(chatMessage, null, 2));
      console.log('=' .repeat(80));
      
      const requestStartTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "אתה מומחה לרישוי עסקים בישראל. אתה יוצר דוחות מקצועיים ומסודרים לעסקים."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });
      const requestEndTime = Date.now();

      const reportContent = response.choices[0].message.content;
      
      console.log('\n✅ תשובה התקבלה מ-ChatGPT');
      
      
      // לוג מפורט של התגובה המלאה מ-ChatGPT
      console.log('\n💬 תגובה מלאה מ-ChatGPT:');
      console.log('=' .repeat(80));
      console.log(JSON.stringify(response, null, 2));
      console.log('=' .repeat(80));
      
      console.log('\n📥 תוכן הדוח שנוצר:');
      console.log('=' .repeat(80));
      console.log(reportContent);
      console.log('=' .repeat(80));
      
      
      // לוג מפורט של השימוש בטוקנים
      
      
      console.log('\n🎉 ===== סיום יצירת דוח AI בהצלחה =====\n');

      return {
        content: reportContent,
        generatedBy: 'ChatGPT-4',
        wordCount: reportContent.split(' ').length,
        sections: this.extractSections(reportContent),
        tokens: response.usage?.total_tokens || 0,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        responseTime: requestEndTime - requestStartTime,
        prompt,
        chatMessage,
        responseRaw: response
      };

    } catch (error) {
      console.error('\n❌ שגיאה בקריאה ל-OpenAI:', error);
      console.log('🔄 יוצר דוח גיבוי...');
      const fallbackReport = this.generateFallbackReport(effectiveBusinessType, answers, requirements);
      console.log('⚠️ ===== סיום עם דוח גיבוי =====\n');
      return fallbackReport;
    }
  }

  /**
   * בונה את הפרומפט המלא
   */
  buildPrompt(businessType, answers, requirements) {
    const requirementsText = this.formatRequirements(requirements);
    // מאפייני העסק מתוך התשובות
    const businessSize = (
      answers?.area_sqm ||
      answers?.size?.area_sqm ||
      answers?.area ||
      answers?.areaSqm ||
      0
    );
    const capacity = (
      answers?.seating_capacity ||
      answers?.max_occupancy ||
      answers?.seating ||
      answers?.capacity ||
      0
    );
    
    return `אתה יועץ רישוי עסקים מומחה בישראל.
צור דוח רישוי מקצועי, מעשי ופעיל עבור מסעדה:

## מאפיינים ספציפיים של העסק:
- גודל: ${businessSize} מ"ר
- תפוסה: ${capacity} מקומות ישיבה


## דרישות רלוונטיות שזוהו:
${requirementsText}

---

## הוראות לדוח:

### עדיפות 1 - דרישות קריטיות (לביצוע מיידי):
התמקד בדרישות המסוכנות/חוקיות החמורות:
- בטיחות אש (מטפים, עמדות כיבוי, גילוי עשן)
- יציאות חירום (רוחב פתחים, ידיות בהלה, שילוט)
- בטיחות מזון (טמפרטורות, הפרדות, HACCP)
- רישיונות חובה (עסק, מזון, אלכוהול)

### עדיפות 2 - דרישות חשובות:
- תכנון אדריכלי ומערכות
- רישיונות משניים
- דרישות עבודה וביטוח

### עדיפות 3 - דרישות תחזוקה:
- הדברת מזיקים
- פיקוח שוטף
- דיווחים תקופתיים

### כל דרישה תכלול:
- הסבר ברור מה צריך לעשות
- למה זה נדרש (הסבר קצר)
- מה קורה אם לא עושים (השלכות)

### כתוב בשפה פשוטה ומובנת לבעל עסק שאינו מומחה.`;
  }

  /**
   * מעצב את הדרישות לטקסט
   */
  formatRequirements(requirements) {
    let text = '';
    let count = 0;

    // עוזר: קיצור ציטוטים לגרעין (עד 160 תווים, שורה אחת)
    const shorten = (s) => {
      if (!s) return '';
      const oneLine = String(s).replace(/\s+/g, ' ').trim();
      return oneLine.length > 160 ? oneLine.slice(0, 157) + '…' : oneLine;
    };
    
    // טיפול במערך דרישות (מהשאלון המדורג)
    if (Array.isArray(requirements)) {
      console.log('📋 מעבד מערך דרישות:', requirements.length);
      requirements.slice(0, 12).forEach((req, index) => { // הגבלה ל-12 דרישות
        if (count >= 15) return;
        text += `- ${req.requirement}\n`;
        if (req.citation) {
          text += `  ציטוט: ${shorten(req.citation)}\n`;
        }
        if (req.priority) {
          text += `  עדיפות: ${req.priority}\n`;
        }
        count++;
      });
    } else {
      // טיפול באובייקט דרישות (מקטגוריות)
      console.log('📋 מעבד אובייקט דרישות:', Object.keys(requirements).length, 'קטגוריות');
      
      // סדר עדיפות: קטגוריות ספציפיות קודם
      const priorityCategories = ['בטיחות אש', 'יציאות חירום', 'בטיחות מזון', 'בטיחות גז', 'טיגון'];
      const otherCategories = Object.keys(requirements).filter(cat => !priorityCategories.includes(cat));
      const orderedCategories = [...priorityCategories.filter(cat => requirements[cat]), ...otherCategories];
      
      orderedCategories.forEach((category, index) => {
        if (count >= 6) return; // הגבלה ל-6 קטגוריות
        const reqs = requirements[category];
        if (!reqs || !Array.isArray(reqs)) return;
        
        text += `\n${category}:\n`;
        // סינון כפילויות לפי טקסט דרישה
        const uniqueByRequirement = [];
        const seen = new Set();
        for (const r of reqs) {
          const key = (r.requirement || '').trim();
          if (key && !seen.has(key)) { seen.add(key); uniqueByRequirement.push(r); }
          if (uniqueByRequirement.length >= 3) break;
        }

        uniqueByRequirement.slice(0, 2).forEach(req => { // הגבלה ל-2 דרישות לכל קטגוריה
          text += `- ${req.requirement}\n`;
          if (req.citation) {
            text += `  ציטוט: ${shorten(req.citation)}\n`;
          }
          if (req.priority) {
            text += `  עדיפות: ${req.priority}\n`;
          }
        });
        count++;
      });
    }
    
    return text;
  }

  /**
   * מחלץ קטעים מהדוח
   */
  extractSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
      if (line.includes('דרישות קריטיות') || line.includes('קריטי')) {
        currentSection = 'critical';
        sections[currentSection] = [];
      } else if (line.includes('דרישות חשובות') || line.includes('חשוב')) {
        currentSection = 'important';
        sections[currentSection] = [];
      } else if (line.includes('דרישות כלליות') || line.includes('כללי')) {
        currentSection = 'general';
        sections[currentSection] = [];
      } else if (line.includes('לוח זמנים') || line.includes('זמנים')) {
        currentSection = 'timeline';
        sections[currentSection] = [];
      } else if (line.includes('מסמכים') || line.includes('תיעוד')) {
        currentSection = 'documents';
        sections[currentSection] = [];
      }
      
      if (currentSection && line.trim()) {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push(line.trim());
      }
    });
    
    return sections;
  }

  /**
   * יוצר דוח גיבוי ללא ChatGPT
   */
  generateFallbackReport(businessType, answers, requirements) {
    console.log('🔄 יוצר דוח גיבוי...');
    
    const totalRequirements = Object.values(requirements).flat().length;
    const categories = Object.keys(requirements);
    
    const report = `# דוח רישוי מסעדה

עסק עם שטח של ${answers.area_sqm || 'לא צוין'} מ"ר נדרש לעמוד ב-${totalRequirements} דרישות רישוי המחולקות ל-${categories.length} קטגוריות עיקריות.

## דרישות קריטיות
הדרישות הבאות הן חובה לביצוע מיידי:
${this.getCriticalRequirements(requirements)}

## דרישות חשובות
הדרישות הבאות נדרשות לביצוע תוך 30 יום:
${this.getImportantRequirements(requirements)}

## דרישות כלליות
הדרישות הבאות נדרשות לביצוע תוך 90 יום:
${this.getGeneralRequirements(requirements)}

## לוח זמנים מומלץ
1. שבוע 1-2: דרישות קריטיות
2. שבוע 3-6: דרישות חשובות  
3. שבוע 7-12: דרישות כלליות

## מסמכים נדרשים
- תכנית אדריכלית
- אישורים מקצועיים
- תיעוד בטיחות
- אישורי רשויות

---
*דוח זה נוצר אוטומטית על בסיס דרישות רגולטוריות ישראליות*`;

    return {
      content: report,
      generatedBy: 'Fallback System',
      wordCount: report.split(' ').length,
      sections: this.extractSections(report)
    };
  }

  getCriticalRequirements(requirements) {
    let text = '';
    Object.entries(requirements).forEach(([category, reqs]) => {
      const critical = reqs.filter(req => req.priority === 'critical' || req.priority === 'required');
      if (critical.length > 0) {
        text += `\n**${category}:**\n`;
        critical.forEach(req => {
          text += `- ${req.requirement}\n`;
        });
      }
    });
    return text || 'אין דרישות קריטיות זמינות';
  }

  getImportantRequirements(requirements) {
    let text = '';
    Object.entries(requirements).forEach(([category, reqs]) => {
      const important = reqs.filter(req => req.priority === 'important' || req.priority === 'medium');
      if (important.length > 0) {
        text += `\n**${category}:**\n`;
        important.forEach(req => {
          text += `- ${req.requirement}\n`;
        });
      }
    });
    return text || 'אין דרישות חשובות זמינות';
  }

  getGeneralRequirements(requirements) {
    let text = '';
    Object.entries(requirements).forEach(([category, reqs]) => {
      const general = reqs.filter(req => req.priority === 'general' || req.priority === 'low' || !req.priority);
      if (general.length > 0) {
        text += `\n**${category}:**\n`;
        general.forEach(req => {
          text += `- ${req.requirement}\n`;
        });
      }
    });
    return text || 'אין דרישות כלליות זמינות';
  }
}

module.exports = new AIReportService();
