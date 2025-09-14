import React, { useState } from 'react';

const AssessmentReport = ({ result, onReset }) => {
  const [aiReport, setAiReport] = useState(null);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [aiReportError, setAiReportError] = useState(null);
  const [showDetailedRequirements, setShowDetailedRequirements] = useState(false);

  // טיפול בנתונים מהשאלון הדינמי והמדורג
  const businessData = result?.businessProfile || result?.data?.business_profile || result?.businessData || result?.data?.businessProfile || {};
  const requirements = result?.requirements || result?.data?.detailed_requirements || result?.requirements || result?.data?.requirements || [];
  const report = result?.aiReport || result?.data?.aiReport || result?.data || result?.report || {};
  const complexity = result?.complexity || 'medium';
  const metadata = result?.metadata || {};

  // דיבוג - בדיקה מה יש בנתונים
  console.log('🔍 AssessmentReport Debug:');
  console.log('result:', result);
  console.log('businessData:', businessData);
  console.log('requirements:', requirements);
  console.log('report:', report);
  console.log('report.content:', report?.content);
  console.log('report.fullContent:', report?.fullContent);

  const getComplexityClass = (level) => {
    switch (level) {
      case 'low': return 'complexity-low';
      case 'medium': return 'complexity-medium';
      case 'high': return 'complexity-high';
      default: return 'complexity-medium';
    }
  };

  const getComplexityText = (level) => {
    switch (level) {
      case 'low': return 'מורכבות נמוכה';
      case 'medium': return 'מורכבות בינונית';
      case 'high': return 'מורכבות גבוהה';
      default: return 'מורכבות בינונית';
    }
  };

  // עזר להמרת boolean לטקסט
  const formatBool = (v) => v === true ? 'כן' : v === false ? 'לא' : '';

  // חילוץ מאפייני העסק מתוך answers/מבנים ישנים
  const areaSqm = businessData.area_sqm || businessData.size?.area_sqm || businessData.area || '';
  const seatingCapacity = businessData.seating_capacity || businessData.size?.seating_capacity || businessData.seating || '';
  const maxOccupancy = businessData.max_occupancy || businessData.occupancy || '';
  const gasUsage = businessData.gas_usage;
  const deliveryService = businessData.delivery_service;
  const alcoholService = businessData.alcohol_service;
  const foodTypes = Array.isArray(businessData.food_types) ? businessData.food_types.join(', ') : (businessData.food_types || '');
  const floorLevel = businessData.floor_level || '';
  const streetAccess = businessData.street_access;
  const outdoorSeating = businessData.outdoor_seating;
  const sewerConnection = businessData.sewer_connection;
  const waterSupply = businessData.water_supply;
  const cookingMethod = businessData.cooking_method || '';
  const deepFrying = businessData.deep_frying;
  const sensitiveFood = businessData.sensitive_food;
  const trainedStaff = businessData.trained_staff;
  const staffPerShift = businessData.staff_per_shift || '';

  // תמיכה במקרה שבו complexity מגיע כמחרוזת ולא כאובייקט
  const complexityLevel = typeof complexity === 'string' ? complexity : (complexity?.level || 'medium');
  const complexityScore = typeof complexity === 'object' ? (complexity?.score ?? null) : null;

  // זיהוי דוח גיבוי (למשל עקב מכסה/כשל API)
  const generatedBy = (result?.data?.report?.generatedBy) || (result?.report?.generatedBy) || (result?.aiReport?.generatedBy) || '';
  const fallbackNotice = String(generatedBy).toLowerCase().includes('fallback');

  // עיצוב תצוגה – המרת טקסט הדוח ל-HTML מודגש וקריא (RTL)
  const escapeHtml = (unsafe) => {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const emphasize = (text) => {
    return text
      .replace(/(דרישות קריטיות|דרישות חשובות|דרישות כלליות|לוח זמנים מומלץ|מסמכים נדרשים|הערה חשובה)/g, '<strong>$1</strong>')
      .replace(/\b(חובה|קריטי|מיידי)\b/g, '<strong>$1</strong>');
  };

  const renderReportContent = (content) => {
    if (!content) return '';
    const lines = String(content).split('\n');
    let html = '';
    let inList = false;

    const closeList = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trimEnd();

      // כותרות Markdown בסיסיות
      const h3 = line.match(/^###\s+(.*)$/);
      const h2 = line.match(/^##\s+(.*)$/);
      const h1 = line.match(/^#\s+(.*)$/);
      const li = line.match(/^-\s+(.*)$/);

      if (h3) {
        closeList();
        html += `<h4>${emphasize(escapeHtml(h3[1]))}</h4>`;
      } else if (h2) {
        closeList();
        html += `<h3>${emphasize(escapeHtml(h2[1]))}</h3>`;
      } else if (h1) {
        closeList();
        html += `<h2>${emphasize(escapeHtml(h1[1]))}</h2>`;
      } else if (li) {
        if (!inList) {
          html += '<ul dir="rtl">';
          inList = true;
        }
        html += `<li>${emphasize(escapeHtml(li[1]))}</li>`;
      } else if (line.trim() === '') {
        closeList();
        html += '<br/>';
      } else {
        closeList();
        html += `<p>${emphasize(escapeHtml(line))}</p>`;
      }
    });

    closeList();
    return html;
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'חובה';
      case 'medium': return 'מומלץ';
      case 'low': return 'אופציונלי';
      default: return priority;
    }
  };

  const getCategoryText = (category) => {
    const categories = {
      'licensing': 'רישוי',
      'safety': 'בטיחות',
      'health': 'בריאות',
      'environment': 'סביבה',
      'tax': 'מסים',
      'employment': 'תעסוקה',
      'zoning': 'תכנון ובנייה'
    };
    return categories[category] || category;
  };

  const generateAiReport = async () => {
    setIsGeneratingAiReport(true);
    setAiReportError(null);
    
    // הכנת הנתונים לשליחה
    const requestData = {
      answers: businessData.answers || {},
      requirements: requirements
    };

    console.log('\n🤖 ===== התחלת יצירת דוח AI מהשאלון המדורג =====');
    console.log('📊 סוג עסק: מסעדה');
    console.log('📝 מספר תשובות:', Object.keys(requestData.answers).length);
    console.log('📋 מספר קטגוריות דרישות:', Object.keys(requestData.requirements).length);
    
    // לוג מפורט של התשובות
    console.log('\n📋 תשובות המשתמש:');
    console.log('='.repeat(50));
    Object.entries(requestData.answers).forEach(([key, value]) => {
      console.log(`${key}: ${JSON.stringify(value)}`);
    });
    console.log('='.repeat(50));
    
    // לוג מפורט של הדרישות
    console.log('\n📋 דרישות מחולצות:');
    console.log('='.repeat(50));
    Object.entries(requestData.requirements).forEach(([category, reqs]) => {
      console.log(`\nקטגוריה: ${category}`);
      reqs.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.requirement}`);
        console.log(`     ציטוט: ${req.citation}`);
        console.log(`     עדיפות: ${req.priority}`);
      });
    });
    console.log('='.repeat(50));
    
    console.log('\n📤 נתונים שנשלחים לשרת:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(requestData, null, 2));
    console.log('='.repeat(60));
    
    // לוג מפורט של הבקשה HTTP
    const requestDetails = {
      url: 'http://localhost:3001/api/ai-report/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestData
    };
    
    console.log('\n🌐 פרטי הבקשה HTTP:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(requestDetails, null, 2));
    console.log('='.repeat(60));
    
    try {
      const requestStartTime = Date.now();
      const response = await fetch('http://localhost:3001/api/ai-report/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      const requestEndTime = Date.now();

      
      console.log(`📊 סטטוס תגובה: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('\n📥 תגובה מהשרת:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(60));
      
      // לוג של הפרומפט שנשלח ל-ChatGPT
      if (result.success && result.data.report) {
        const serverReport = result.data.report || {};
        console.log('\n🤖 ===== הפרומפט שנשלח ל-ChatGPT =====');
        console.log('='.repeat(80));
        
        if (serverReport.prompt) {
          console.log('📤 PROMPT (מהשרת):');
          console.log('='.repeat(80));
          console.log(serverReport.prompt);
          console.log('='.repeat(80));
          
        } else {
          console.log('⚠️ לא התקבל prompt מהשרת. בונה לוג מקומי לצורך דיבוג...');
          
          // נבנה את הפרומפט כמו שהשרת בונה אותו (עם סדר עדיפות) — Fallback
          const priorityCategories = ['בטיחות אש', 'יציאות חירום', 'בטיחות מזון', 'כללי'];
          const otherCategories = Object.keys(requestData.requirements).filter(cat => !priorityCategories.includes(cat));
          const orderedCategories = [...priorityCategories.filter(cat => requestData.requirements[cat]), ...otherCategories];
          
          const requirementsText = orderedCategories.slice(0, 10).map(category => {
            const reqs = requestData.requirements[category];
            if (!reqs || !Array.isArray(reqs)) return '';
            
            let text = `\n${category}:\n`;
            reqs.slice(0, 3).forEach(req => {
              text += `- ${req.requirement}\n`;
              if (req.citation) {
                text += `  ציטוט: ${req.citation}\n`;
              }
              if (req.priority) {
                text += `  עדיפות: ${req.priority}\n`;
              }
            });
            return text;
          }).join('');
          
          const prompt = `אתה מומחה לרישוי עסקים בישראל. צור דוח מקצועי ומפורט עבור מסעדה. ${requestData.businessType}.

חשוב מאוד: התמקד בכל הדרישות הספציפיות - כולל דרישות בטיחות אש (עמדות כיבוי, מטפי כיבוי), יציאות חירום (פתחי יציאה, ידיות בהלה), דרישות מזון (בטיחות מזון, הפרדת מזון, טיגון עמוק, מזון רגיש), ודרישות אחרות. כל הדרישות הספציפיות הן קריטיות למסעדה!

התחל את הדוח עם הדרישות הספציפיות שמופיעות ברשימה למעלה, ואז המשך עם הדרישות הכלליות. אל תסתפק בדרישות כלליות בלבד!

דרישות רישוי רלוונטיות:
${requirementsText}

הערה חשובה: הדרישות הספציפיות (בטיחות אש, יציאות חירום, מזון רגיש) הן החשובות ביותר ויש להתחיל איתן בדוח!

צור דוח מקצועי ומפורט בעברית הכולל:
1. דרישות קריטיות (חובה מיידית) - עם הסבר מפורט מה צריך לעשות
2. דרישות חשובות (לביצוע תוך 30 יום) - עם הסבר מפורט
3. דרישות כלליות (לביצוע תוך 90 יום) - עם הסבר מפורט
4. לוח זמנים מומלץ לביצוע
5. מסמכים נדרשים
6. הערכות עלות משוערות
7. טיפים ועצות מקצועיות

כל דרישה תכלול:
- הסבר ברור מה צריך לעשות
- למה זה נדרש (הסבר קצר)
- מה קורה אם לא עושים (השלכות)
- זמן ביצוע משוער

כתוב בשפה פשוטה ומובנת לבעל עסק שאינו מומחה.`;
          
          console.log(prompt);
          console.log('='.repeat(80));
          
        }

        // לוג של ההודעה המלאה (אם זמינה)
        if (serverReport.chatMessage) {
          console.log('\n💬 הודעה מלאה (מהשרת):');
          console.log('='.repeat(80));
          console.log(JSON.stringify(serverReport.chatMessage, null, 2));
          console.log('='.repeat(80));
        }

        // לוג של התגובה המלאה (אם זמינה)
        if (serverReport.responseRaw) {
          console.log('\n📥 תגובה מלאה מ-ChatGPT (מהשרת):');
          console.log('='.repeat(80));
          console.log(JSON.stringify(serverReport.responseRaw, null, 2));
          console.log('='.repeat(80));
        }
        
        console.log('🤖 ===== סיום הפרומפט =====\n');
      }
      
      // לוג מפורט של הדוח שנוצר
      if (result.success && result.data.report) {
        console.log('\n📄 דוח AI שנוצר:');
        console.log('='.repeat(60));
        console.log(result.data.report.content);
        console.log('='.repeat(60));
        console.log(`📊 פרטי הדוח:`);
        console.log(`   נוצר על ידי: ${result.data.report.generatedBy}`);
        console.log(`   אורך: ${result.data.report.content.length} תווים`);
        
      }
      
      if (result.success) {
        console.log('\n✅ דוח AI נוצר בהצלחה!');
        console.log(`📄 דוח AI נוצר בהצלחה`);
        console.log(`🤖 נוצר על ידי: ${result.data.report.generatedBy}`);
        
        setAiReport(result.data.report);
      } else {
        console.log('\n❌ דוח AI נכשל');
        console.log(`🔍 שגיאה: ${result.error}`);
        throw new Error(result.error || 'Failed to generate AI report');
      }
    } catch (err) {
      console.log('\n❌ שגיאה ביצירת דוח AI');
      console.log(`🔍 פרטי השגיאה: ${err.message}`);
      setAiReportError(err.message);
    } finally {
      setIsGeneratingAiReport(false);
      console.log('\n🏁 ===== סיום יצירת דוח AI =====\n');
    }
  };

  // פונקציות לטיפול בדרישות (מערך או אובייקט)
  const getTotalRequirements = () => {
    if (Array.isArray(requirements)) {
      return requirements.length;
    } else if (typeof requirements === 'object' && requirements !== null) {
      return Object.values(requirements).reduce((total, categoryReqs) => {
        return total + (Array.isArray(categoryReqs) ? categoryReqs.length : 0);
      }, 0);
    }
    return 0;
  };

  const getRequirementsByPriority = (priority) => {
    if (Array.isArray(requirements)) {
      return requirements.filter(req => req.priority === priority).length;
    } else if (typeof requirements === 'object' && requirements !== null) {
      return Object.values(requirements).reduce((total, categoryReqs) => {
        if (Array.isArray(categoryReqs)) {
          return total + categoryReqs.filter(req => req.priority === priority).length;
        }
        return total;
      }, 0);
    }
    return 0;
  };

  return (
    <div className="report-container" dir="rtl" style={{ textAlign: 'right', width: '100%', maxWidth: '100%', padding: '0 12px' }}>
      <div className="report-header" dir="rtl" style={{ textAlign: 'right' }}>
        <h1 className="report-title">דוח רישוי עסק</h1>
        <div className={`complexity-badge ${getComplexityClass(complexityLevel)}`}>
          {getComplexityText(complexityLevel)}{complexityScore !== null ? ` (ציון: ${complexityScore}/10)` : ''}
        </div>
        <div style={{
          marginTop: '12px',
          background: '#f7f7f7',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '12px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>פרטי העסק</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '8px 16px'
          }}>
            <div><strong>סוג עסק:</strong> מסעדה</div>
            {areaSqm !== '' && <div><strong>שטח עסק:</strong> {areaSqm} מ"ר</div>}
            {seatingCapacity !== '' && <div><strong>מקומות ישיבה:</strong> {seatingCapacity}</div>}
            {maxOccupancy !== '' && <div><strong>תפוסה מרבית:</strong> {maxOccupancy}</div>}
            {foodTypes && <div><strong>סוגי מזון:</strong> {foodTypes}</div>}
            {cookingMethod && <div><strong>שיטת הכנה:</strong> {cookingMethod}</div>}
            {typeof deepFrying !== 'undefined' && <div><strong>טיגון עמוק:</strong> {formatBool(deepFrying)}</div>}
            {typeof gasUsage !== 'undefined' && <div><strong>שימוש בגז:</strong> {formatBool(gasUsage)}</div>}
            {typeof deliveryService !== 'undefined' && <div><strong>משלוחים:</strong> {formatBool(deliveryService)}</div>}
            {typeof alcoholService !== 'undefined' && <div><strong>הגשת אלכוהול:</strong> {formatBool(alcoholService)}</div>}
            {floorLevel && <div><strong>מפלס:</strong> {floorLevel}</div>}
            {typeof streetAccess !== 'undefined' && <div><strong>גישה מהרחוב:</strong> {formatBool(streetAccess)}</div>}
            {typeof outdoorSeating !== 'undefined' && <div><strong>ישיבה חיצונית:</strong> {formatBool(outdoorSeating)}</div>}
            {typeof sewerConnection !== 'undefined' && <div><strong>חיבור לביוב:</strong> {formatBool(sewerConnection)}</div>}
            {typeof waterSupply !== 'undefined' && <div><strong>אספקת מים:</strong> {formatBool(waterSupply)}</div>}
            {typeof sensitiveFood !== 'undefined' && <div><strong>מזון רגיש:</strong> {formatBool(sensitiveFood)}</div>}
            {typeof trainedStaff !== 'undefined' && <div><strong>צוות מיומן:</strong> {formatBool(trainedStaff)}</div>}
            {staffPerShift !== '' && <div><strong>מס׳ עובדים במשמרת:</strong> {staffPerShift}</div>}
          </div>
        </div>
      </div>

      {/* דוח AI */}
      {(report || aiReport) && (
        <div className="ai-report" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="ai-report-header" dir="rtl" style={{ textAlign: 'right' }}>
            <h2 className="ai-report-title">דוח חכם מותאם אישית</h2>
          </div>

          {fallbackNotice && (
            <div style={{
              marginTop: '10px',
              marginBottom: '10px',
              padding: '12px 14px',
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              color: '#856404'
            }} dir="rtl">
              הדוח נוצר אוטומטית מאחר שמכסת ה־API נוצלה או שהייתה בעיית תקשורת. ייתכנו פשרות ברמת הפירוט.
            </div>
          )}
          <div className="ai-content" dir="rtl" style={{ textAlign: 'right', width: '100%', maxWidth: '100%' }}>
            {(aiReport?.content || report?.fullContent || report?.content) ? (
              <div dangerouslySetInnerHTML={{ 
                __html: renderReportContent(aiReport?.content || report?.fullContent || report?.content)
              }} />
            ) : (
              <div dir="rtl" style={{ textAlign: 'right' }}>
                <h3>סיכום כללי</h3>
                <p>{report?.summary || aiReport?.summary}</p>
                
                {(report?.sections || aiReport?.sections) && (report?.sections?.length > 0 || aiReport?.sections?.length > 0) && (
                  <div>
                    <h3>פירוט הדרישות</h3>
                    {(report?.sections || aiReport?.sections).map((section, index) => (
                      <div key={index}>
                        <h4>{section.title}</h4>
                        <p>{section.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {(report?.note || aiReport?.note) && (
                  <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
                    <strong>הערה:</strong> {report?.note || aiReport?.note}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* סטטיסטיקות הוסרו לפי בקשה */}

      {/* רשימת דרישות מפורטת - תוצג רק אם המשתמש לחץ על הכפתור */}
      {showDetailedRequirements && (requirements.length > 0 || (typeof requirements === 'object' && Object.keys(requirements).length > 0)) && (
        <div className="report-section" dir="rtl" style={{ textAlign: 'right' }}>
          <h2 className="section-title">דרישות רישוי מפורטות</h2>
          <div className="requirements-list">
            {/* טיפול בדרישות מהשאלון המדורג (קטגוריות) */}
            {typeof requirements === 'object' && !Array.isArray(requirements) ? (
              Object.entries(requirements).map(([category, categoryRequirements]) => (
                <div key={category} className="category-section">
                  <h3 className="category-title">{category}</h3>
                  {categoryRequirements.map((requirement, index) => (
                    <div key={index} className="requirement-card">
                      <div className="requirement-header">
                        <div>
                          <h4 className="requirement-title">
                            {requirement.requirement || requirement.title || `דרישה ${index + 1}`}
                          </h4>
                          <span className={`requirement-priority priority-${requirement.priority}`}>
                            {getPriorityText(requirement.priority)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="requirement-content">
                        {requirement.citation && showDetailedRequirements && (
                          <div className="exact-citation">
                            <h4>ציטוט מהמסמך הרגולטורי:</h4>
                            <blockquote className="citation-text">
                              {requirement.citation}
                            </blockquote>
                            {requirement.source && (
                              <div className="citation-source">
                                <strong>מקור:</strong> {requirement.source.chapter} - {requirement.source.section}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {requirement.question && (
                          <div className="question-context">
                            <strong>שאלה:</strong> {requirement.question}
                          </div>
                        )}
                        
                        {requirement.answer && (
                          <div className="answer-context">
                            <strong>תשובה:</strong> {requirement.answer}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              /* טיפול בדרישות מהשאלון הדינמי (מערך) */
              requirements.map((requirement, index) => (
              <div key={requirement.id || index} className="requirement-card">
                <div className="requirement-header">
                  <div>
                    <h3 className="requirement-title">
                      {requirement.category_name || requirement.title || `דרישה ${index + 1}`}
                    </h3>
                    <span className={`requirement-priority priority-${requirement.priority}`}>
                      {getPriorityText(requirement.priority)}
                    </span>
                  </div>
                </div>
                
                {/* הצגת הציטוט המדויק מהמסמך */}
                {requirement.exact_text && showDetailedRequirements && (
                  <div className="exact-citation">
                    <h4>📄 ציטוט מהמסמך הרגולטורי:</h4>
                    <blockquote className="citation-text">
                      {requirement.exact_text}
                    </blockquote>
                    {requirement.source && (
                      <div className="citation-source">
                        <strong>מקור:</strong> {requirement.source.chapter} - {requirement.source.section}
                      </div>
                    )}
                  </div>
                )}
                
                <p className="requirement-description">
                  {requirement.description || requirement.exact_text || 'דרישה רגולטורית'}
                </p>
                
                {/* הצגת פעולות נדרשות */}
                {requirement.actions_required && requirement.actions_required.length > 0 && (
                  <div className="required-actions">
                    <h4>פעולות נדרשות:</h4>
                    <ul>
                      {requirement.actions_required.map((action, actionIndex) => (
                        <li key={actionIndex}>
                          <strong>{action.action}:</strong> {action.item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* הצגת הערות יישום */}
                {requirement.implementation_notes && requirement.implementation_notes.length > 0 && (
                  <div className="implementation-notes">
                    <h4>הערות ליישום:</h4>
                    <ul>
                      {requirement.implementation_notes.map((note, noteIndex) => (
                        <li key={noteIndex}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="requirement-details">
                  <div className="detail-item">
                    <div className="detail-label">קטגוריה</div>
                    <div className="detail-value">{getCategoryText(requirement.category)}</div>
                  </div>
                  
                  {requirement.estimatedCost && (
                    <div className="detail-item">
                      <div className="detail-label">עלות משוערת</div>
                      <div className="detail-value">{requirement.estimatedCost}</div>
                    </div>
                  )}
                  
                  {requirement.timeToComplete && (
                    <div className="detail-item">
                      <div className="detail-label">זמן ביצוע</div>
                      <div className="detail-value">{requirement.timeToComplete}</div>
                    </div>
                  )}
                  
                  {requirement.authority && (
                    <div className="detail-item">
                      <div className="detail-label">גוף מאשר</div>
                      <div className="detail-value">{requirement.authority}</div>
                    </div>
                  )}
                  
                  {requirement.renewalPeriod && (
                    <div className="detail-item">
                      <div className="detail-label">תקופת חידוש</div>
                      <div className="detail-value">{requirement.renewalPeriod}</div>
                    </div>
                  )}
                </div>
                
                {requirement.documentsRequired && requirement.documentsRequired.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <div className="detail-label">מסמכים נדרשים:</div>
                    <ul style={{ marginTop: '5px', paddingRight: '20px' }}>
                      {requirement.documentsRequired.map((doc, docIndex) => (
                        <li key={docIndex} style={{ fontSize: '0.9rem', color: '#666' }}>
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
            )}
          </div>
        </div>
      )}

      {/* הודעת הצלחה */}
      {getTotalRequirements() === 0 && (
        <div className="report-section">
          <div style={{ textAlign: 'center', padding: '40px', background: '#d4edda', borderRadius: '10px' }}>
            <h3 style={{ color: '#155724', marginBottom: '15px' }}>מעולה!</h3>
            <p style={{ color: '#155724', fontSize: '1.1rem' }}>
              לא נמצאו דרישות רישוי ספציפיות לעסק שלך.
              <br />
              מומלץ להתייעץ עם מומחה רישוי עסקים לקבלת מידע מדויק ועדכני.
            </p>
          </div>
        </div>
      )}

      {/* כפתורי פעולה – מיושרים באותו גובה מתחת לדוח */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'center', 
        alignItems: 'stretch', 
        marginTop: '24px', 
        paddingTop: '20px', 
        borderTop: '2px solid #e1e1e1'
      }} dir="rtl">
        <button 
          onClick={onReset} 
          className="btn btn-primary"
          style={{ padding: '12px 24px', minHeight: '44px' }}
        >
          מילוי שאלון מחדש
        </button>
        <button 
          onClick={() => window.print()} 
          className="btn btn-secondary"
          style={{ padding: '12px 24px', minHeight: '44px' }}
        >
          הדפסת הדוח
        </button>
        <button 
          onClick={() => setShowDetailedRequirements(!showDetailedRequirements)}
          className="btn btn-secondary"
          style={{ padding: '12px 24px', minHeight: '44px' }}
        >
          {showDetailedRequirements ? 'הסתר ציטוטים' : 'הצג ציטוטים'}
        </button>
      </div>

      {/* כפתור יצירת דוח AI הוסר לפי בקשה */}

      {/* דוח AI */}
      {aiReport && (
        <div style={{ 
          marginTop: '30px', 
          padding: '25px', 
          background: '#f8f9fa', 
          border: '2px solid #28a745',
          borderRadius: '10px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }} dir="rtl">
            <h3 style={{ color: '#28a745', margin: 0 }}>דוח AI מקצועי</h3>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>נוצר על ידי: {aiReport.generatedBy}</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            whiteSpace: 'pre-line',
            lineHeight: '1.6',
            fontSize: '1rem',
            textAlign: 'right'
          }} dir="rtl">
            {aiReport.content}
          </div>
        </div>
      )}

      {/* הכפתור לציטוטים משולב בשורת הפעולות למעלה */}

      {/* הערה חשובה */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        background: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        textAlign: 'center'
      }} dir="rtl">
        <h4 style={{ color: '#856404', marginBottom: '10px' }}>הערה חשובה</h4>
        <p style={{ color: '#856404', fontSize: '0.95rem' }}>
          דוח זה נוצר באופן אוטומטי ומשמש להכוונה כללית בלבד. 
          מומלץ להתייעץ עם מומחה רישוי עסקים לקבלת מידע מדויק ועדכני 
          לפני קבלת החלטות עסקיות.
        </p>
      </div>
    </div>
  );
};

export default AssessmentReport;
