import React, { useState, useEffect } from 'react';
import './GradedQuestionnaire.css';

const GradedQuestionnaire = ({ businessType, onComplete }) => {
  const [questions, setQuestions] = useState({});
  const [answers, setAnswers] = useState({});
  const [currentSection, setCurrentSection] = useState('basic');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // מיפוי קטגוריות לעברית
  const sectionNames = {
    basic: 'מידע בסיסי',
    services: 'שירותים ופעילויות',
    location: 'מיקום ומבנה',
    infrastructure: 'תשתיות קיימות',
    foodPreparation: 'הכנת מזון',
    staff: 'כוח אדם'
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:3001/api/graded-questionnaire/questions`);
      const data = await response.json();
      
      if (data.success) {
        setQuestions(data.questions);
        console.log('✅ שאלות נטענו:', Object.keys(data.questions).length);
      } else {
        setError('שגיאה בטעינת השאלות');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
      console.error('Error loading questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    console.log(`Updated answer for ${questionId}:`, value);
  };

  const getQuestionsBySection = (section) => {
    return Object.entries(questions).filter(([key, question]) => {
      // מיפוי שאלות לקטגוריות
      if (section === 'basic') {
        return ['q1', 'q2', 'q3'].includes(key);
      } else if (section === 'services') {
        return ['q4', 'q5', 'q6', 'q7'].includes(key);
      } else if (section === 'location') {
        return ['q8', 'q9', 'q10'].includes(key);
      } else if (section === 'infrastructure') {
        return ['q11', 'q12', 'q13'].includes(key);
      } else if (section === 'foodPreparation') {
        return ['q14', 'q15', 'q16'].includes(key);
      } else if (section === 'staff') {
        return ['q17', 'q18'].includes(key);
      }
      return false;
    });
  };

  const getNextSection = () => {
    const sections = ['basic', 'services', 'location', 'infrastructure', 'foodPreparation', 'staff'];
    const currentIndex = sections.indexOf(currentSection);
    return currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;
  };

  const getPrevSection = () => {
    const sections = ['basic', 'services', 'location', 'infrastructure', 'foodPreparation', 'staff'];
    const currentIndex = sections.indexOf(currentSection);
    return currentIndex > 0 ? sections[currentIndex - 1] : null;
  };

  const isCurrentSectionComplete = () => {
    const sectionQuestions = getQuestionsBySection(currentSection);
    return sectionQuestions.every(([key, question]) => {
      if (!question.required) return true;
      return answers[question.id] !== undefined && answers[question.id] !== '';
    });
  };

  const isAllRequiredComplete = () => {
    return Object.entries(questions).every(([key, question]) => {
      if (!question.required) return true;
      return answers[question.id] !== undefined && answers[question.id] !== '';
    });
  };

  const handleNext = () => {
    const nextSection = getNextSection();
    if (nextSection) {
      setCurrentSection(nextSection);
    }
  };

  const handlePrev = () => {
    const prevSection = getPrevSection();
    if (prevSection) {
      setCurrentSection(prevSection);
    }
  };

  const handleSubmit = async () => {
    if (!isAllRequiredComplete()) {
      alert('אנא מלא את כל השדות הנדרשים');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('\n🤖 ===== התחלת יצירת דוח AI מהשאלון המדורג =====');
      console.log('📊 סוג עסק:', businessType);
      console.log('📝 מספר תשובות:', Object.keys(answers).length);
      
      // לוג מפורט של התשובות
      console.log('\n📋 תשובות המשתמש:');
      console.log('='.repeat(50));
      Object.entries(answers).forEach(([key, value]) => {
        console.log(`${key}: ${JSON.stringify(value)}`);
      });
      console.log('='.repeat(50));
      
      const requestData = {
        answers,
        requirements: {}
      };
      
      console.log('\n📤 נתונים שנשלחים לשרת:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(requestData, null, 2));
      console.log('='.repeat(60));
      
      // שליחה ישירה ל-AI Report Service
      const response = await fetch('http://localhost:3001/api/ai-report/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      
      console.log('\n📥 תגובה מהשרת:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(60));
      
      if (result.success) {
        // לוג ישיר של הפרומפט וההודעה כפי שהתקבלו מהשרת (מייד אחרי השליחה)
        if (result.data && result.data.report) {
          const serverReport = result.data.report;
          console.log('\n🤖 ===== פרומפט/הודעה מהשרת (ישירות מהשאלון) =====');
          if (serverReport.prompt) {
            console.log('📤 PROMPT (מהשרת):');
            console.log('='.repeat(80));
            console.log(serverReport.prompt);
            console.log('='.repeat(80));
            
          } else {
            console.log('⚠️ השרת לא החזיר prompt');
          }

          if (serverReport.chatMessage) {
            console.log('\n💬 הודעה מלאה (מהשרת):');
            console.log('='.repeat(80));
            console.log(JSON.stringify(serverReport.chatMessage, null, 2));
            console.log('='.repeat(80));
          }

          if (serverReport.responseRaw) {
            console.log('\n📥 תגובה מלאה מ-ChatGPT (מהשרת):');
            console.log('='.repeat(80));
            console.log(JSON.stringify(serverReport.responseRaw, null, 2));
            console.log('='.repeat(80));
          }
          // גם ברמת data.top-level אם זמינים
          if (result.data.prompt && !serverReport.prompt) {
            console.log('\n📤 PROMPT (top-level):');
            console.log('='.repeat(80));
            console.log(result.data.prompt);
            console.log('='.repeat(80));
          }
          if (result.data.chatMessage && !serverReport.chatMessage) {
            console.log('\n💬 chatMessage (top-level):');
            console.log('='.repeat(80));
            console.log(JSON.stringify(result.data.chatMessage, null, 2));
            console.log('='.repeat(80));
          }
          console.log('🤖 ===== סוף פרומפט/הודעה =====');
        }
        // לוג מפורט של הדוח שנוצר
        if (result.data.report) {
          console.log('\n📄 דוח AI שנוצר:');
          console.log('='.repeat(60));
          console.log(result.data.report.content);
          console.log('='.repeat(60));
          console.log(`📊 פרטי הדוח:`);
          console.log(`   נוצר על ידי: ${result.data.report.generatedBy}`);
          console.log(`   אורך: ${result.data.report.content.length} תווים`);
          
        }
        
        console.log('\n✅ דוח AI נוצר בהצלחה!');
        
        // יצירת אובייקט תוצאה שמתאים ל-AssessmentReport
        const assessmentResult = {
          data: {
            businessType: 'מסעדה',
            businessProfile: answers,
            requirements: result.data.requirements || {},
            aiReport: result.data.report,
            report: result.data.report  // גם כאן כדי שהקוד הישן יעבוד
          }
        };
        onComplete(assessmentResult);
      } else {
        setError('שגיאה ביצירת דוח AI');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
      console.error('Error generating AI report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const value = answers[question.id];

    switch (question.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value) || '')}
            min={question.validation?.min}
            max={question.validation?.max}
            className="question-input"
            required={question.required}
          />
        );

      case 'boolean':
        return (
          <div className="boolean-options">
            <label className="boolean-option">
              <input
                type="radio"
                name={question.id}
                value="true"
                checked={value === true}
                onChange={() => handleAnswerChange(question.id, true)}
                required={question.required}
              />
              כן
            </label>
            <label className="boolean-option">
              <input
                type="radio"
                name={question.id}
                value="false"
                checked={value === false}
                onChange={() => handleAnswerChange(question.id, false)}
                required={question.required}
              />
              לא
            </label>
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="question-select"
            required={question.required}
          >
            <option value="">בחר אפשרות</option>
            {question.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="multiselect-options">
            {question.options.map((option, index) => {
              // לוגיקה מיוחדת לשאלת סוגי מזון
              if (question.id === 'food_types') {
                const isNone = option === 'ללא';
                const hasNone = selectedValues.includes('ללא');
                const hasMeat = selectedValues.some(v => ['בשר', 'עוף', 'דגים'].includes(v));
                const isMeat = ['בשר', 'עוף', 'דגים'].includes(option);
                
                // אם בוחרים "ללא", לא ניתן לבחור בשר/עוף/דגים
                // אם בוחרים בשר/עוף/דגים, לא ניתן לבחור "ללא"
                const isDisabled = (isNone && hasMeat) || (isMeat && hasNone);
                
                return (
                  <label key={index} className={`multiselect-option ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (isNone) {
                            // אם בוחרים "ללא", נסיר את כל הבשר/עוף/דגים
                            handleAnswerChange(question.id, ['ללא']);
                          } else {
                            // אם בוחרים בשר/עוף/דגים, נסיר את "ללא"
                            const newValues = selectedValues.filter(v => v !== 'ללא');
                            handleAnswerChange(question.id, [...newValues, option]);
                          }
                        } else {
                          handleAnswerChange(question.id, selectedValues.filter(v => v !== option));
                        }
                      }}
                    />
                    {option}
                  </label>
                );
              }
              
              // לוגיקה רגילה לשאלות multiselect אחרות
              return (
                <label key={index} className="multiselect-option">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleAnswerChange(question.id, [...selectedValues, option]);
                      } else {
                        handleAnswerChange(question.id, selectedValues.filter(v => v !== option));
                      }
                    }}
                  />
                  {option}
                </label>
              );
            })}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="question-input"
            required={question.required}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="graded-questionnaire" dir="rtl" style={{ textAlign: 'right' }}>
        <div className="loading">
          <h2>טוען שאלון מדורג...</h2>
          <p>מכין שאלות מותאמות למסעדות...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graded-questionnaire">
        <div className="error">
          <h2>שגיאה</h2>
          <p>{error}</p>
          <button onClick={loadQuestions} className="retry-button">
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  const currentQuestions = getQuestionsBySection(currentSection);
  const nextSection = getNextSection();
  const prevSection = getPrevSection();

  return (
    <div className="graded-questionnaire" dir="rtl" style={{ textAlign: 'right' }}>
      <div className="questionnaire-header" dir="rtl" style={{ textAlign: 'right', marginBottom: '12px' }}>
        <h2>שאלון רישוי למסעדה</h2>
        <p style={{ marginTop: '6px', color: '#6c757d' }}>מלא את הפרטים לקבלת דוח AI מותאם אישית.</p>
      </div>

      <div className="progress-bar">
        <div className="progress-track"></div>
        <div className="progress-sections">
          {Object.entries(sectionNames).map(([key, name]) => (
            <div
              key={key}
              className={`progress-section ${currentSection === key ? 'active' : ''} ${
                getQuestionsBySection(key).length === 0 ? 'disabled' : ''
              }`}
            >
              <div className="section-number">
                {Object.keys(sectionNames).indexOf(key) + 1}
              </div>
              <div className="section-name">{name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="current-section">
        <h3>{sectionNames[currentSection]}</h3>
        
        {currentQuestions.length === 0 ? (
          <div className="no-questions">
            <p>אין שאלות רלוונטיות לקטגוריה זו עבור סוג העסק שנבחר.</p>
          </div>
        ) : (
          <div className="questions-container">
            {currentQuestions.map(([key, question]) => (
              <div key={key} className="question-item">
                <label className="question-label">
                  {question.question}
                  {question.required && <span className="required">*</span>}
                </label>
                {renderQuestion(question)}
                {question.validation && (
                  <div className="validation-info">
                    {question.validation.min && `מינימום: ${question.validation.min}`}
                    {question.validation.max && ` מקסימום: ${question.validation.max}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="navigation">
        <div className="nav-buttons">
          {prevSection && (
            <button onClick={handlePrev} className="nav-button prev">
              הקודם →
            </button>
          )}
          
          {nextSection ? (
            <button 
              onClick={handleNext} 
              className="nav-button next"
              disabled={!isCurrentSectionComplete()}
            >
              ← הבא
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              className="nav-button submit"
              disabled={!isAllRequiredComplete() || isSubmitting}
            >
              {isSubmitting ? 'יוצר דוח AI...' : 'סיום ויצירת דוח AI'}
            </button>
          )}
        </div>
        
        <div className="progress-info">
          <p>
            שאלות נענו: {Object.keys(answers).length} / {Object.keys(questions).length}
          </p>
          {!isAllRequiredComplete() && (
            <p className="incomplete-warning">
              יש למלא את כל השדות הנדרשים
            </p>
          )}
          {isAllRequiredComplete() && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px', 
              background: '#e7f3ff', 
              color: '#0066cc',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              <p><strong>🎯 מוכן!</strong> לחיצה על "סיום ויצירת דוח AI" תיצור דוח מקצועי מ-ChatGPT</p>
              
            </div>
          )}
        </div>
      </div>

      {/* כפתור חזרה לבחירת סוג שאלון הוסר */}
    </div>
  );
};

export default GradedQuestionnaire;
