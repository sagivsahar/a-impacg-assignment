const documentLoader = require('./regulatoryDocumentLoader');

/**
 * שאלון מדורג מתקדם לחילוץ דרישות רגולטוריות
 * מבוסס על ניתוח מעמיק של המסמך הרגולטורי
 */
class GradedQuestionnaire {
  constructor() {
    this.questions = this.initializeQuestions();
    this.requirementsExtractor = new RequirementsExtractor();
  }

  /**
   * מאתחל את השאלון המדורג
   */
  initializeQuestions() {
    return {
      // חלק א': מידע בסיסי (חובה)
      basic: {
        q1: {
          id: 'area_sqm',
          question: "מהו שטח העסק הכולל במ\"ר?",
          type: "number",
          validation: { min: 10, max: 5000 },
          required: true,
          triggers: {
            "<=50": ["פטור ממערכת גילוי אש", "גלגלון כיבוי בסיסי"],
            "50-120": ["דרישות כיבוי בינוניות", "גלגלון חובה"],
            "120-300": ["עמדות כיבוי מלאות", "מערכת גילוי אש"],
            ">300": ["מערכת מתזים", "לוח פיקוד כבאים"]
          }
        },
        
        q2: {
          id: 'seating_capacity',
          question: "מהו מספר מקומות הישיבה המתוכנן?",
          type: "number",
          validation: { min: 0, max: 1000 },
          required: false,
          conditional: true, // רק לעסקים עם ישיבה
          triggers: {
            "<=50": ["פתח יציאה אחד 0.9מ'"],
            "51-200": ["שני פתחי יציאה 1.1מ'", "דרישות תברואה מוגברות"],
            ">200": ["דרישות מיוחדות", "מערכת כריזה", "מפסק חשמל חירום"]
          }
        },
        
        q3: {
          id: 'max_occupancy',
          question: "מהי התפוסה המקסימלית המתוכננת (מספר אנשים)?",
          type: "number",
          validation: { min: 1, max: 2000 },
          required: true,
          triggers: {
            "<=50": ["דרישות בסיסיות"],
            "51-100": ["ידית בהלה בדלתות"],
            "101-300": ["דרישות מוגברות"],
            ">300": ["מערכת מתזים חובה", "מערכת מסירת הודעות"]
          }
        }
      },

      // חלק ב': שירותים ופעילויות
      services: {
        q4: {
          id: 'alcohol_service',
          question: "האם מתוכננת הגשת משקאות אלכוהוליים?",
          type: "boolean",
          required: false,
          triggers: {
            true: [
              "שילוט איסור מכירה לקטינים",
              "תנאי רישוי משטרה (בוטל)",
              "דרישות אחסון מיוחדות"
            ]
          }
        },
        
        q5: {
          id: 'gas_usage',
          question: "האם מתוכנן שימוש במערכת גז למטבח?",
          type: "boolean",
          required: false,
          triggers: {
            true: [
              "בדיקת מערכת גז ת\"י 158",
              "התקני הפסקת זרימה",
              "מערכת כיבוי במנדפים",
              "אישור בודק גז מוסמך"
            ]
          }
        },
        
        q6: {
          id: 'delivery_service',
          question: "האם מתוכנן שירות משלוחים?",
          type: "boolean",
          required: false,
          triggers: {
            true: [
              "דרישות נספח ב' - שליחת מזון",
              "אזור ייעודי להכנת משלוחים",
              "דרישות רכב להובלת מזון",
              "בקרת טמפרטורה במשלוחים"
            ]
          }
        },
        
        q7: {
          id: 'food_types',
          question: "האם מתוכננת הגשת בשר/עוף/דגים?",
          type: "multiselect",
          options: ["בשר", "עוף", "דגים", "ללא"],
          required: false,
          validation: {
            // אם בוחרים "ללא", לא ניתן לבחור גם בשר/עוף/דגים
            custom: (value) => {
              if (Array.isArray(value)) {
                const hasNone = value.includes('ללא');
                const hasMeat = value.some(item => ['בשר', 'עוף', 'דגים'].includes(item));
                return !(hasNone && hasMeat);
              }
              return true;
            }
          },
          triggers: {
            "בשר": ["דרישות אחסון נפרד", "אישור וטרינרי", "הפרדה בין סוגי בשר"],
            "דגים": ["אחסון נפרד לדגים", "דרישות הפשרה מיוחדות"]
          }
        }
      },

      // חלק ג': מיקום ומבנה
      location: {
        q8: {
          id: 'floor_level',
          question: "באיזו קומה ימוקם העסק?",
          type: "select",
          options: ["קרקע", "קומה 1", "קומה 2+", "מרתף"],
          required: true,
          triggers: {
            "מרתף": ["דרישות אוורור מיוחדות", "יציאות חירום נוספות"],
            "קומה 2+": ["דרישות מעלית", "דרכי מילוט מיוחדות"]
          }
        },
        
        q9: {
          id: 'street_access',
          question: "האם קיימת גישה ישירה מהרחוב?",
          type: "boolean",
          required: true,
          triggers: {
            false: ["דרישות שילוט מוגברות", "תאורת חירום נוספת"]
          }
        },
        
        q10: {
          id: 'outdoor_seating',
          question: "האם מתוכננת סגירת חורף/ישיבה חיצונית?",
          type: "boolean",
          required: false,
          triggers: {
            true: ["דרישות נוספות לסגירת חורף", "היתר שימוש חורג"]
          }
        }
      },

      // חלק ד': תשתיות קיימות
      infrastructure: {
        q11: {
          id: 'sewer_connection',
          question: "האם קיים חיבור לביוב עירוני?",
          type: "boolean",
          required: true,
          triggers: {
            false: ["נדרש אישור מיוחד ממשרד הבריאות"],
            true: ["התקנת מפריד שומן חובה"]
          }
        },
        
        q13: {
          id: 'water_supply',
          question: "האם קיימת אספקת מים עירונית?",
          type: "boolean",
          required: true,
          triggers: {
            true: ["בדיקת לחץ מים", "התקנת מז\"ח"],
            false: ["דרישות מיוחדות לאספקת מים"]
          }
        }
      },

      // חלק ה': הכנת מזון
      foodPreparation: {
        q14: {
          id: 'cooking_method',
          question: "מהי שיטת העבודה המתוכננת?",
          type: "select",
          options: ["בשל-הגש", "בשל-קרר", "בשל-הקפא", "חימום בלבד"],
          required: false,
          conditional: true, // רק לעסקים עם מזון
          triggers: {
            "בשל-קרר": ["דרישות קירור מיוחדות", "משב קור"],
            "בשל-הקפא": ["דרישות הקפאה", "סימון תאריכים"]
          }
        },
        
        q15: {
          id: 'deep_frying',
          question: "האם מתוכנן טיגון עמוק?",
          type: "boolean",
          required: false,
          conditional: true, // רק לעסקים עם מזון
          triggers: {
            true: ["מערכת כיבוי במנדפים", "איסוף שמן משומש"]
          }
        },
        
        q16: {
          id: 'sensitive_food',
          question: "האם מתוכננת הכנת מזון רגיש (סושי/טרטר/ביצים רכות)?",
          type: "boolean",
          required: false,
          conditional: true, // רק לעסקים עם מזון
          triggers: {
            true: ["דרישות מחמירות", "רישוי מיוחד", "בקרת טמפרטורה הדוקה"]
          }
        }
      },

      // חלק ו': כוח אדם
      staff: {
        q17: {
          id: 'staff_per_shift',
          question: "כמה עובדים מתוכננים במשמרת?",
          type: "number",
          validation: { min: 1, max: 100 },
          required: true,
          triggers: {
            ">10": ["חדרי הלבשה נפרדים", "מספר שירותים לעובדים"],
            ">20": ["חדר אוכל לעובדים"]
          }
        },
        
        q18: {
          id: 'trained_staff',
          question: "האם יש עובד עם הכשרה בטיפול במזון?",
          type: "boolean",
          required: false,
          conditional: true, // רק לעסקים עם מזון
          triggers: {
            false: ["חובת הכשרה לעובד בכיר"],
            true: ["תיעוד הכשרות"]
          }
        }
      }
    };
  }

  /**
   * מחזיר שאלות לפי סוג עסק
   * @param {string} businessType - סוג העסק
   * @returns {Object} שאלות מותאמות
   */
  getQuestionsForBusinessType(businessType) {
    const allQuestions = { ...this.questions.basic };
    
    // שאלות מקומות ישיבה - רק לעסקים עם ישיבה (מסעדות, בתי קפה)
    if (this.isSeatingBusiness(businessType)) {
      if (allQuestions.q2) {
        allQuestions.q2.required = true;
      }
    } else {
      // הסרת שאלת מקומות ישיבה מעסקים שאינם עם ישיבה
      if (allQuestions.q2) {
        allQuestions.q2.required = false;
        allQuestions.q2.conditional = true;
      }
    }
    
    // שאלות מזון - רק לעסקי מזון
    if (this.isFoodBusiness(businessType)) {
      Object.assign(allQuestions, this.questions.services);
      Object.assign(allQuestions, this.questions.foodPreparation);
      if (allQuestions.q18) {
        allQuestions.q18.required = true;
      }
    }
    
    // שאלות תשתיות תמיד נדרשות
    Object.assign(allQuestions, this.questions.location);
    Object.assign(allQuestions, this.questions.infrastructure);
    Object.assign(allQuestions, this.questions.staff);
    
    // התאמות מיוחדות לפי סוג עסק
    if (this.isWorkplace(businessType)) {
      // למקומות עבודה - התאמות מיוחדות
      if (allQuestions.q2) {
        allQuestions.q2.required = false;
        allQuestions.q2.conditional = true;
      }
    }
    
    if (this.isRetailBusiness(businessType)) {
      // לחנויות - התאמות מיוחדות
      if (allQuestions.q2) {
        allQuestions.q2.required = false;
        allQuestions.q2.conditional = true;
      }
    }
    
    return allQuestions;
  }

  /**
   * מעבד תשובות ומחלץ דרישות
   * @param {Object} answers - תשובות המשתמש
   * @param {string} businessType - סוג העסק
   * @returns {Object} דרישות רלוונטיות
   */
  async processAnswers(answers, businessType) {
    try {
      console.log('🔄 מעבד תשובות ומחלץ דרישות...');
      
      // טעינת המסמך
      const documentText = await documentLoader.loadDocument('pdf');
      
      // עיבוד התשובות
      const requirements = this.requirementsExtractor.processAnswers(answers, documentText);
      
      // הוספת דרישות ספציפיות לפי תשובות
      console.log('🔄 מוסיף דרישות ספציפיות לפי תשובות...');
      const specificRequirements = this.extractSpecificRequirementsFromAnswers(answers, documentText);
      
      // הוספת הדרישות הספציפיות לדרישות הכלליות
      if (specificRequirements.length > 0) {
        if (!requirements['בטיחות מזון']) {
          requirements['בטיחות מזון'] = [];
        }
        requirements['בטיחות מזון'].push(...specificRequirements);
        console.log(`✅ נוספו ${specificRequirements.length} דרישות בטיחות מזון`);
      }
      
      // יצירת פרופיל עסק
      const businessProfile = this.createBusinessProfile(answers, businessType);
      
      return {
        success: true,
        businessProfile,
        requirements,
        metadata: {
          totalQuestions: Object.keys(answers).length,
          totalRequirements: this.countTotalRequirements(requirements),
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error processing answers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * יוצר פרופיל עסק מהתשובות
   * @param {Object} answers - תשובות
   * @param {string} businessType - סוג העסק
   * @returns {Object} פרופיל עסק
   */
  createBusinessProfile(answers, businessType) {
    return {
      businessType,
      size: {
        area_sqm: answers.area_sqm || 0,
        seating_capacity: answers.seating_capacity || 0,
        max_occupancy: answers.max_occupancy || 0
      },
      location: {
        floor_level: answers.floor_level,
        street_access: answers.street_access,
        outdoor_seating: answers.outdoor_seating || false
      },
      infrastructure: {
        electrical_connection: answers.electrical_connection,
        sewer_connection: answers.sewer_connection,
        water_supply: answers.water_supply
      },
      services: {
        alcohol: answers.alcohol_service || false,
        gas_usage: answers.gas_usage || false,
        delivery: answers.delivery_service || false,
        food_types: answers.food_types || []
      },
      food_preparation: {
        cooking_method: answers.cooking_method,
        deep_frying: answers.deep_frying || false,
        sensitive_food: answers.sensitive_food || false
      },
      staff: {
        per_shift: answers.staff_per_shift || 0,
        trained: answers.trained_staff || false
      }
    };
  }

  /**
   * בודק אם זה עסק עם ישיבה
   * @param {string} businessType - סוג העסק
   * @returns {boolean} האם עסק עם ישיבה
   */
  isSeatingBusiness(businessType) {
    const seatingBusinesses = [
      'מסעדה', 'בית קפה', 'קפה', 'בר', 'מזנון', 'פיצריה', 
      'בית אוכל', 'מסעדה מהירה', 'דינר', 'ביסטרו', 'קפיטריה'
    ];
    return seatingBusinesses.some(type => businessType.includes(type));
  }

  /**
   * בודק אם זה עסק מזון
   * @param {string} businessType - סוג העסק
   * @returns {boolean} האם עסק מזון
   */
  isFoodBusiness(businessType) {
    const foodBusinesses = [
      'מסעדה', 'בית קפה', 'קפה', 'בר', 'מזנון', 'פיצריה', 
      'בית אוכל', 'מסעדה מהירה', 'דינר', 'ביסטרו', 'מטבח', 'קפיטריה'
    ];
    return foodBusinesses.some(type => businessType.includes(type));
  }

  /**
   * בודק אם זה מקום עבודה (משרד, מפעל וכו')
   * @param {string} businessType - סוג העסק
   * @returns {boolean} האם מקום עבודה
   */
  isWorkplace(businessType) {
    const workplaces = [
      'משרד', 'מפעל', 'מחסן', 'מעבדה', 'סטודיו', 'גלריה', 
      'מרפאה', 'קליניקה', 'מכון', 'בית ספר', 'גן ילדים'
    ];
    return workplaces.some(type => businessType.includes(type));
  }

  /**
   * בודק אם זה עסק קמעונאי
   * @param {string} businessType - סוג העסק
   * @returns {boolean} האם עסק קמעונאי
   */
  isRetailBusiness(businessType) {
    const retailBusinesses = [
      'חנות', 'מרכול', 'סופרמרקט', 'בוטיק', 'חנות בגדים', 
      'חנות נעליים', 'חנות אלקטרוניקה', 'חנות ספרים', 'פארם'
    ];
    return retailBusinesses.some(type => businessType.includes(type));
  }

  /**
   * סופר דרישות כוללות
   * @param {Object} requirements - דרישות
   * @returns {number} מספר דרישות
   */
  countTotalRequirements(requirements) {
    let total = 0;
    Object.values(requirements).forEach(category => {
      if (Array.isArray(category)) {
        total += category.length;
      }
    });
    return total;
  }

  /**
   * מחלץ דרישות ספציפיות מכל התשובות
   * @param {Object} answers - כל התשובות
   * @param {string} documentText - טקסט המסמך
   * @returns {Array} דרישות ספציפיות
   */
  extractSpecificRequirementsFromAnswers(answers, documentText) {
    const specificRequirements = [];
    
    console.log('🔍 מחלץ דרישות ספציפיות מתשובות:', Object.keys(answers));
    
    // דרישות מזון רגיש
    if (answers.sensitive_food) {
      console.log('🍽️ מחלץ דרישות מזון רגיש...');
      const sensitiveFoodReqs = this.requirementsExtractor.extractSensitiveFoodRequirements(true, documentText);
      console.log('דרישות מזון רגיש שנמצאו:', sensitiveFoodReqs);
      specificRequirements.push(...sensitiveFoodReqs);
      console.log(`✅ נמצאו ${sensitiveFoodReqs.length} דרישות מזון רגיש`);
    }
    
    // דרישות סוגי מזון
    if (answers.food_types && answers.food_types.length > 0) {
      console.log('🥩 מחלץ דרישות סוגי מזון...');
      const foodTypesReqs = this.requirementsExtractor.extractFoodTypesRequirements(answers.food_types, documentText);
      specificRequirements.push(...foodTypesReqs);
      console.log(`✅ נמצאו ${foodTypesReqs.length} דרישות סוגי מזון`);
    }
    
    // דרישות טיגון עמוק
    if (answers.deep_frying) {
      console.log('🔥 מחלץ דרישות טיגון עמוק...');
      const deepFryingReqs = this.requirementsExtractor.extractDeepFryingRequirements(true, documentText);
      specificRequirements.push(...deepFryingReqs);
      console.log(`✅ נמצאו ${deepFryingReqs.length} דרישות טיגון עמוק`);
    }
    
    // דרישות שיטת בישול
    if (answers.cooking_method) {
      console.log('👨‍🍳 מחלץ דרישות שיטת בישול...');
      const cookingMethodReqs = this.requirementsExtractor.extractCookingMethodRequirements(answers.cooking_method, documentText);
      specificRequirements.push(...cookingMethodReqs);
      console.log(`✅ נמצאו ${cookingMethodReqs.length} דרישות שיטת בישול`);
    }
    
    console.log(`🎯 סה"כ דרישות ספציפיות נמצאו: ${specificRequirements.length}`);
    return specificRequirements;
  }
}

/**
 * מחלץ דרישות מהמסמך הרגולטורי
 */
class RequirementsExtractor {
  constructor() {
    this.documentSections = [];
  }

  /**
   * מעבד תשובות ומחלץ דרישות
   * @param {Object} answers - תשובות
   * @param {string} documentText - טקסט המסמך
   * @returns {Object} דרישות מאורגנות
   */
  processAnswers(answers, documentText) {
    const requirements = [];
    
    // עיבוד כל תשובה
    Object.keys(answers).forEach(questionId => {
      const answer = answers[questionId];
      const question = this.getQuestionById(questionId);
      
      if (question) {
        // חילוץ דרישות ספציפיות לפי שאלה
        const specificRequirements = this.extractSpecificRequirements(questionId, answer, documentText);
        
        specificRequirements.forEach(req => {
          requirements.push({
            question: question.question,
            answer: answer,
            requirement: req.requirement,
            citation: req.citation,
            source: this.extractSource(documentText, documentText.indexOf(req.citation)),
            priority: req.priority,
            category: this.categorizeRequirement(req.requirement)
          });
        });
        
        // חילוץ דרישות על פי triggers (לגיבוי)
        if (question.triggers) {
          const triggers = this.getTriggers(question, answer);
          
          triggers.forEach(trigger => {
            const citation = this.findCitationInDocument(trigger, documentText);
            if (citation) {
              requirements.push({
                question: question.question,
                answer: answer,
                requirement: trigger,
                citation: citation.text,
                source: citation.source,
                priority: this.calculatePriority(trigger),
                category: this.categorizeRequirement(trigger)
              });
            }
          });
        }
      }
    });
    
    // הוספת דרישות כלליות (תמיד נדרשות)
    const generalRequirements = [
      ...this.extractDocumentRequirements(documentText),
      ...this.extractSmokingPreventionRequirements(documentText),
      ...this.extractPestControlRequirements(documentText),
      ...this.extractSignageRequirements(documentText),
      ...this.extractWaterQualityRequirements(documentText),
      ...this.extractWasteManagementRequirements(documentText)
    ];
    
    // הוספת דרישות כלליות לרשימה
    generalRequirements.forEach(req => {
      requirements.push({
        question: 'דרישות כלליות',
        answer: 'תמיד נדרש',
        requirement: req.requirement,
        citation: req.citation,
        source: this.extractSource(documentText, documentText.indexOf(req.citation)),
        priority: req.priority,
        category: this.categorizeRequirement(req.requirement)
      });
    });
    
    return this.consolidateRequirements(requirements);
  }

  /**
   * מוצא שאלה לפי ID
   * @param {string} questionId - ID השאלה
   * @returns {Object} שאלה
   */
  getQuestionById(questionId) {
    // חיפוש בכל הקטגוריות
    const allQuestions = {
      ...new GradedQuestionnaire().questions.basic,
      ...new GradedQuestionnaire().questions.services,
      ...new GradedQuestionnaire().questions.location,
      ...new GradedQuestionnaire().questions.infrastructure,
      ...new GradedQuestionnaire().questions.foodPreparation,
      ...new GradedQuestionnaire().questions.staff
    };
    
    return Object.values(allQuestions).find(q => q.id === questionId);
  }

  /**
   * מחלץ triggers לפי תשובה
   * @param {Object} question - שאלה
   * @param {*} answer - תשובה
   * @returns {Array} triggers
   */
  getTriggers(question, answer) {
    const triggers = [];
    
    if (question.triggers) {
      // בדיקת triggers ספציפיים
      if (question.triggers[answer] !== undefined) {
        triggers.push(...question.triggers[answer]);
      }
      
      // בדיקת triggers מספריים
      if (typeof answer === 'number') {
        Object.keys(question.triggers).forEach(condition => {
          if (this.evaluateCondition(answer, condition)) {
            triggers.push(...question.triggers[condition]);
          }
        });
      }
    }
    
    return triggers;
  }

  /**
   * מעריך תנאי מספרי
   * @param {number} value - ערך
   * @param {string} condition - תנאי
   * @returns {boolean} האם מתקיים
   */
  evaluateCondition(value, condition) {
    if (condition.includes('<=')) {
      return value <= parseInt(condition.replace('<=', ''));
    } else if (condition.includes('>=')) {
      return value >= parseInt(condition.replace('>=', ''));
    } else if (condition.includes('<')) {
      return value < parseInt(condition.replace('<', ''));
    } else if (condition.includes('>')) {
      return value > parseInt(condition.replace('>', ''));
    } else if (condition.includes('-')) {
      const [min, max] = condition.split('-').map(n => parseInt(n));
      return value >= min && value <= max;
    }
    return false;
  }

  /**
   * מוצא ציטוט במסמך
   * @param {string} trigger - trigger
   * @param {string} documentText - טקסט המסמך
   * @returns {Object} ציטוט
   */
  findCitationInDocument(trigger, documentText) {
    // חיפוש מילות מפתח
    const keywords = this.extractKeywords(trigger);
    
    for (const keyword of keywords) {
      const index = documentText.indexOf(keyword);
      if (index !== -1) {
        return {
          text: this.extractFullSentence(documentText, index),
          source: this.extractSource(documentText, index)
        };
      }
    }
    
    return null;
  }


  /**
   * מחלץ דרישות ספציפיות לפי שאלה
   * @param {string} questionId - ID השאלה
   * @param {*} answer - תשובה
   * @param {string} documentText - טקסט המסמך
   * @returns {Array} דרישות רלוונטיות
   */
  extractSpecificRequirements(questionId, answer, documentText) {
    const requirements = [];
    
    console.log(`🔍 מחלץ דרישות עבור שאלה: ${questionId}, תשובה:`, answer);
    
    // מפה של דרישות ספציפיות לכל שאלה
    const questionRequirements = {
      'area_sqm': this.extractAreaRequirements(answer, documentText),
      'seating_capacity': this.extractSeatingRequirements(answer, documentText),
      'max_occupancy': this.extractOccupancyRequirements(answer, documentText),
      'alcohol_service': this.extractAlcoholRequirements(answer, documentText),
      'gas_usage': this.extractGasRequirements(answer, documentText),
      'delivery_service': this.extractDeliveryRequirements(answer, documentText),
      'food_types': this.extractFoodTypesRequirements(answer, documentText),
      'floor_level': this.extractFloorLevelRequirements(answer, documentText),
      'street_access': this.extractStreetAccessRequirements(answer, documentText),
      'outdoor_seating': this.extractOutdoorSeatingRequirements(answer, documentText),
      'sewer_connection': this.extractSewerRequirements(answer, documentText),
      'water_supply': this.extractWaterSupplyRequirements(answer, documentText),
      'cooking_method': this.extractCookingMethodRequirements(answer, documentText),
      'deep_frying': this.extractDeepFryingRequirements(answer, documentText),
      'sensitive_food': this.extractSensitiveFoodRequirements(answer, documentText),
      'staff_per_shift': this.extractStaffRequirements(answer, documentText),
      'trained_staff': this.extractTrainedStaffRequirements(answer, documentText)
    };
    
    const extractedReqs = questionRequirements[questionId] || [];
    console.log(`✅ נמצאו ${extractedReqs.length} דרישות עבור ${questionId}`);
    extractedReqs.forEach(req => {
      console.log(`   - ${req.requirement}`);
    });
    
    return extractedReqs;
  }

  /**
   * מחלץ דרישות לפי שטח
   */
  extractAreaRequirements(area, documentText) {
    const requirements = [];
    
    if (area <= 50) {
      const citation = this.findSpecificText(documentText, 'בעסק עד 50 מ"ר ועל פי החלטת נותן האישור ניתן לפטור מהתקנת גלגלון ובתנאי שיוצבו מטפי כיבוי מסוג אבקה יבשה בגודל של 6 ק"ג');
      if (citation) {
        requirements.push({
          requirement: 'פטור מגלגלון - מטפי כיבוי אבקה יבשה 6 ק"ג',
          citation: citation,
          priority: 'required'
        });
      }
    } else if (area <= 120) {
      const citation = this.findSpecificText(documentText, 'בעסק ששטחו עד 120 מ"ר יותקן גלגלון כיבוי אש עם זרנוק בקוטר "3/4 באורך שייתן מענה לכיסוי כל שטח העסק עם מזנק צמוד. תשתית הצינורות לגלגלון תהיה ממתכת. אם קיימת הפרדת אש ועשן בין חלקי העסק, יש להתקין ציוד כאמור בכל אחד מחלקיו');
      if (citation) {
        requirements.push({
          requirement: 'גלגלון כיבוי אש עם זרנוק 3/4" ומזנק צמוד - תשתית מתכת',
          citation: citation,
          priority: 'required'
        });
      }
    } else if (area <= 300) {
      const citation = this.findSpecificText(documentText, 'בעסק ששטחו מעל 120 מ"ר תותקנה עמדות כיבוי אש, הכוללות כל אחת: ברז כיבוי בקוטר "2, 2 זרנוקים בקוטר "2 באורך 15 מ\' כל אחד, מזנק בקוטר "2, גלגלון עם צינור בקוטר "3/4 עם מזנק צמוד, מטפה אבקה במשקל של 6 ק\'\'ג');
      if (citation) {
        requirements.push({
          requirement: 'עמדות כיבוי אש מלאות - ברז 2", 2 זרנוקים 15מ\', מזנק, גלגלון, מטפה 6 ק"ג',
          citation: citation,
          priority: 'required'
        });
      }
      
      const cabinetCitation = this.findSpecificText(documentText, 'הציוד יאוכסן בארון שמידותיו לכל הפחות: גובה 120 ס\'\'מ, רוחב 80 ס\'\'מ, ועומק 30 ס\'\'מ. על הארון ייכתב: \'\'עמדת כיבוי אש\'\'');
      if (cabinetCitation) {
        requirements.push({
          requirement: 'ארון עמדת כיבוי אש - 120x80x30 ס"מ עם שלט',
          citation: cabinetCitation,
          priority: 'required'
        });
      }
    } else {
      const citation = this.findSpecificText(documentText, 'במקומות המפורטים להלן תותקן מערכת כיבוי אש אוטומטית במים על פי תקן הישראלי ת"י 1596 מערכות מתזים: התקנה (להלן - מערכת מתזים): בעסק ששטחו הכולל מעל 301 מ"ר ו המיועד לשמש מעל 300 איש');
      if (citation) {
        requirements.push({
          requirement: 'מערכת מתזים (ספרינקלרים) - תקן ת"י 1596',
          citation: citation,
          priority: 'critical'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי מקומות ישיבה
   */
  extractSeatingRequirements(seating, documentText) {
    const requirements = [];
    
    if (seating <= 50) {
      const citation = this.findSpecificText(documentText, 'בעסק המיועד להכיל עד 50 איש, יהיה פתח יציאה אחד ברוחב של 0.9 מ\' נטו לפחות');
      if (citation) {
        requirements.push({
          requirement: 'פתח יציאה אחד ברוחב 0.9 מ\' נטו',
          citation: citation,
          priority: 'required'
        });
      }
    } else if (seating <= 500) {
      const citation = this.findSpecificText(documentText, 'בעסק המיועד להכיל למעלה מ- 50 איש אך לא יותר מ- 500 איש יהיו לפחות שני פתחי יציאה ברוחב של 1.1 מ\' נטו כל אחד, וכיוון הפתיחה של הדלת יהיה כלפי כיוון המילוט');
      if (citation) {
        requirements.push({
          requirement: 'שני פתחי יציאה ברוחב 1.1 מ\' נטו כל אחד - כיוון פתיחה כלפי מילוט',
          citation: citation,
          priority: 'required'
        });
      }
    } else {
      const citation = this.findSpecificText(documentText, 'בעסק המיועד להכיל למעלה מ- 500 איש אך לא יותר מ- 1,000 איש יהיו לפחות 3 פתחים ברוחב של 1.1 מ\' נטו כל אחד, וכיוון הפתיחה של הדלת יהיה כלפי כיוון המילוט');
      if (citation) {
        requirements.push({
          requirement: 'שלושה פתחי יציאה ברוחב 1.1 מ\' נטו כל אחד - כיוון פתיחה כלפי מילוט',
          citation: citation,
          priority: 'required'
        });
      }
    }
    
    // דרישות תברואה
    const sanitationCitation = this.findSpecificText(documentText, 'מספר השירותים ומתקני התברואה יחושב לפי פרק 3 להל"ת');
    if (sanitationCitation) {
      requirements.push({
        requirement: 'שירותים ומתקני תברואה לפי פרק 3 להל"ת',
        citation: sanitationCitation,
        priority: 'required'
      });
    }
    
    // דרישות שילוט ושירותים
    const signageCitation = this.findSpecificText(documentText, 'יוצבו שלטים בולטים המכוונים לשירותים');
    if (signageCitation) {
      requirements.push({
        requirement: 'שלטים בולטים המכוונים לשירותים',
        citation: signageCitation,
        priority: 'required'
      });
    }
    
    const cleaningCitation = this.findSpecificText(documentText, 'בעל העסק אחראי לכך שפעולות ניקיון שוטף יבוצעו בכל שעות פתיחת העסק למבקרים. השירותים יהיו נקיים בכל עת');
    if (cleaningCitation) {
      requirements.push({
        requirement: 'ניקיון שוטף של השירותים בכל שעות הפעילות',
        citation: cleaningCitation,
        priority: 'required'
      });
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי תפוסה
   */
  extractOccupancyRequirements(occupancy, documentText) {
    const requirements = [];
    
    if (occupancy > 100) {
      const citation = this.findSpecificText(documentText, 'בדלת המשמשת ליציאה מחלק מהעסק המיועדים להכיל למעלה מ- 100 איש או מקומה בעסק תותקן ידית בהלה');
      if (citation) {
        requirements.push({
          requirement: 'ידית בהלה בדלתות יציאה - מנגנון בהלה לפי תקנות התכנון והבנייה',
          citation: citation,
          priority: 'required'
        });
      }
    }
    
    if (occupancy > 300) {
      const citation = this.findSpecificText(documentText, 'בעסק ששטחו העיקרי גדול מ- 300 מ"ר ו מיועד לשמש מעל 300 איש תותקן מערכת מסירת הודעות (כריזת חירום) בהתאם לקבוע בפרט 3.9.32.3 לתוספת השנייה לתקנות התכנון והבנייה');
      if (citation) {
        requirements.push({
          requirement: 'מערכת מסירת הודעות (כריזת חירום) - פרט 3.9.32.3',
          citation: citation,
          priority: 'required'
        });
      }
      
      const maintenanceCitation = this.findSpecificText(documentText, 'מערכת מסירת ההודעות (כריזת חירום) תתוחזק במצב תקין בכל עת');
      if (maintenanceCitation) {
        requirements.push({
          requirement: 'תחזוקה שוטפת של מערכת מסירת הודעות',
          citation: maintenanceCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות אלכוהול
   */
  extractAlcoholRequirements(hasAlcohol, documentText) {
    const requirements = [];
    
    if (hasAlcohol) {
      const citation = this.findSpecificText(documentText, 'בעל העסק או מנהל העסק יודיע לציבור כי לא יימכרו משקאות משכרים למי שטרם מלאו לו 18 שנים, ויציב שילוט שיוצג מעל פתחי הכניסה לבית העסק. לשון ההודעה תהיה כדלהלן: מכירה או הגשה של משקאות משכרים למי שטרם מלאו לו 18 שנה אסורה!');
      if (citation) {
        requirements.push({
          requirement: 'שילוט איסור מכירה לקטינים - 50*40 ס"מ, גובה 1.80-2.20 מ\'',
          citation: citation,
          priority: 'required'
        });
      }
      
      const signDetailsCitation = this.findSpecificText(documentText, 'השלט יהיה עשוי מחומר קשיח, למעט קרטון, שמידותיו 50*40 ס"מ. האותיות בשלט יהיו בצבע שחור על רקע לבן, כאשר האותיות בפסקה הראשונה להודעה יהיו בגודל אחיד של 2.5*2.5 ס"מ');
      if (signDetailsCitation) {
        requirements.push({
          requirement: 'פרטי השלט: חומר קשיח, אותיות שחורות על רקע לבן, גודל 2.5*2.5 ס"מ',
          citation: signDetailsCitation,
          priority: 'required'
        });
      }
      
      const lightingCitation = this.findSpecificText(documentText, 'השלט יותקן עם סידורי הארה בצדו ויואר בשעות החשיכה בכל עת שהעסק פתוח לציבור');
      if (lightingCitation) {
        requirements.push({
          requirement: 'תאורה לשלט בשעות החשיכה',
          citation: lightingCitation,
          priority: 'required'
        });
      }
      
      const policeCitation = this.findSpecificText(documentText, 'משטרת ישראל איננה נותנת אישור בפריט זה החל מיום 14.6.2022');
      if (policeCitation) {
        requirements.push({
          requirement: 'הערה: משטרת ישראל איננה נותנת אישור החל מ-14.6.2022',
          citation: policeCitation,
          priority: 'info'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות גז
   */
  extractGasRequirements(hasGas, documentText) {
    const requirements = [];
    
    if (hasGas) {
      const citation = this.findSpecificText(documentText, 'מערכת הגפ"מ המשמשת את העסק תענה לנדרש בתקן ישראלי ת"י 158, מתקנים לגזים פחמימניים מעובים, המסופקים בתוך מכלים מטלטלים');
      if (citation) {
        requirements.push({
          requirement: 'בדיקת מערכת גז ת"י 158 - אישור בודק גז מוסמך',
          citation: citation,
          priority: 'required'
        });
      }
      
      const maintenanceCitation = this.findSpecificText(documentText, 'מערכת הגז, המכשירים והאביזרים לצריכת הגפ"מ והמנדפים הקיימים בעסק, יתוחזקו במצב תקין, בכל עת');
      if (maintenanceCitation) {
        requirements.push({
          requirement: 'תחזוקה שוטפת של מערכת הגז והמנדפים',
          citation: maintenanceCitation,
          priority: 'required'
        });
      }
      
      const cutoffCitation = this.findSpecificText(documentText, 'על כל המכשירים והאביזרים לצרכני גז המשמשים את העסק יותקנו התקנים להפסקת זרימת גז במקרה של דליפה, כולל ניתוק מקורות אנרגיה');
      if (cutoffCitation) {
        requirements.push({
          requirement: 'התקני הפסקת זרימת גז במקרה דליפה',
          citation: cutoffCitation,
          priority: 'required'
        });
      }
      
      const hoodCitation = this.findSpecificText(documentText, 'אם קיימים מנדפים בעסק יש להתקן מערכת כיבוי במנדפים בהתאם ל-תקן ישראלי ת"י 5356, חלק 2, מערכות כיבוי אש: כיבוי אש בכימיקלים רטובים, כולל ניתוק ממקור אנרגיה');
      if (hoodCitation) {
        requirements.push({
          requirement: 'מערכת כיבוי במנדפים - תקן ת"י 5356 חלק 2',
          citation: hoodCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות משלוחים
   */
  extractDeliveryRequirements(hasDelivery, documentText) {
    const requirements = [];
    
    if (hasDelivery) {
      const citation = this.findSpecificText(documentText, 'שליחת מזון, במידה וקיימת, תתבצע בהתאם להנחיות שליחת מזון - מ. הבריאות 2012. ראה נספח ב\'');
      if (citation) {
        requirements.push({
          requirement: 'הנחיות שליחת מזון - נספח ב\'',
          citation: citation,
          priority: 'required'
        });
      }
      
      const areaCitation = this.findSpecificText(documentText, 'מחלקה לשליחת מזון ייועד שטח סביר נפרד על מנת להבטיח תנאי תברואה נאותים');
      if (areaCitation) {
        requirements.push({
          requirement: 'אזור ייעודי להכנת משלוחים - שטח נפרד לתנאי תברואה',
          citation: areaCitation,
          priority: 'required'
        });
      }
      
      const equipmentCitation = this.findSpecificText(documentText, 'מדור להכנת משלוחים: יכלול שולחנות עבודה, מדפים ויחידות קירור / הקפאה בנפח מספיק לפעולה תקינה של העסק; במדור יתקין מתקן לרחיצת ידיים לשימוש אותה מחלקה בלבד וכן מתקן לשטיפת כלים שיהיו תקינים לשימוש בכל עת');
      if (equipmentCitation) {
        requirements.push({
          requirement: 'ציוד למדור משלוחים: שולחנות, מדפים, קירור, רחצת ידיים, שטיפת כלים',
          citation: equipmentCitation,
          priority: 'required'
        });
      }
      
      const tempCitation = this.findSpecificText(documentText, 'בזמן הובלה מזון ישמר לפי הוראות יצרן או בטמפרטורות הבאות: א. מזון חם יוחזק בטמפרטורה פנימית של לפחות +65 מעלות צלזיוס; ב. מזון קר יוחזק בטמפרטורה פנימית שלא תעלה על +4 מעלות צלזיוס; ג. מזון קפוא יוחזק בטמפרטורה פנימית שלא תעלה על -18 מעלות צלזיוס; ד. ביצים יוחזקו בטמפרטורה שעד 20 מעלות צלזיוס');
      if (tempCitation) {
        requirements.push({
          requirement: 'בקרת טמפרטורה בהובלה: חם 65°+, קר 4°-, קפוא 18°-, ביצים 20°',
          citation: tempCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מוצא טקסט ספציפי במסמך
   */
  findSpecificText(documentText, searchText) {
    const index = documentText.indexOf(searchText);
    if (index !== -1) {
      return this.extractFullSentence(documentText, index);
    }
    return null;
  }

  /**
   * מחלץ דרישות לפי סוגי מזון
   */
  extractFoodTypesRequirements(foodTypes, documentText) {
    const requirements = [];
    
    if (foodTypes && foodTypes.length > 0) {
      // חיפוש טקסט על הפרדת מזון
      const separationIndex = documentText.indexOf('יש להפריד בין מזון גולמי למזון מעובד');
      if (separationIndex !== -1) {
        const context = documentText.substring(Math.max(0, separationIndex - 50), separationIndex + 100);
        requirements.push({
          requirement: 'הפרדה בין מזון גולמי למזון מעובד במתקנים נפרדים',
          citation: context,
          priority: 'required'
        });
      }
      
      if (foodTypes.includes('בשר') || foodTypes.includes('עוף') || foodTypes.includes('דגים')) {
        // חיפוש טקסט על תעודות וטרינריות
        const vetIndex = documentText.indexOf('בשר, דגים, עוף יגיעו בלווי תעודות וטרינריות');
        if (vetIndex !== -1) {
          const context = documentText.substring(Math.max(0, vetIndex - 50), vetIndex + 100);
          requirements.push({
            requirement: 'תעודות וטרינריות לבשר, דגים ועוף',
            citation: context,
            priority: 'required'
          });
        }
        
        // חיפוש טקסט על הפרדת סוגי מזון
        const meatIndex = documentText.indexOf('לא יאוחסנו יחד סוגי מזון שונים');
        if (meatIndex !== -1) {
          const context = documentText.substring(Math.max(0, meatIndex - 50), meatIndex + 100);
          requirements.push({
            requirement: 'הפרדה באחסון בין סוגי מזון שונים',
            citation: context,
            priority: 'required'
          });
        }
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי קומה
   */
  extractFloorLevelRequirements(floorLevel, documentText) {
    const requirements = [];
    
    if (floorLevel === 'מרתף') {
      const ventilationCitation = this.findSpecificText(documentText, 'שטחי העסק יאווררו באחד מאמצעים אלה: חלונות הנפתחים אל אויר החוץ, ששטחם הניתן לפתיחה 1/8 לפחות משטח רצפת החדר; מערכת מכנית לאוורור מלאכותי שתחליף אויר 8 פעמים לפחות בשעה');
      if (ventilationCitation) {
        requirements.push({
          requirement: 'אוורור מיוחד למרתף - חלונות או מערכת מכנית 8 פעמים בשעה',
          citation: ventilationCitation,
          priority: 'required'
        });
      }
    }
    
    if (floorLevel === 'קומה 2+') {
      const elevatorCitation = this.findSpecificText(documentText, 'בסמוך למעלית. -"אין להשתמש במעלית בזמן שריפה"');
      if (elevatorCitation) {
        requirements.push({
          requirement: 'שלט אזהרה ליד מעלית - איסור שימוש בזמן שריפה',
          citation: elevatorCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי גישה מהרחוב
   */
  extractStreetAccessRequirements(hasStreetAccess, documentText) {
    const requirements = [];
    
    if (!hasStreetAccess) {
      const lightingCitation = this.findSpecificText(documentText, 'בשעות החשיכה, תופעל מחוץ לעסק תאורה אשר תאיר את דרכי הגישה לעסק ואת היציאות ממנו. התאורה החיצונית תהיה תקינה בכל עת');
      if (lightingCitation) {
        requirements.push({
          requirement: 'תאורה חיצונית לדרכי גישה ויציאות',
          citation: lightingCitation,
          priority: 'required'
        });
      }
    }
    
    const emergencyLightingCitation = this.findSpecificText(documentText, 'בעסק תותקן תאורת חירום שתתחיל לפעול ותאיר את נתיב המילוט במקרה של כשל באספקת החשמל או נפילה במתח החשמל');
    if (emergencyLightingCitation) {
      requirements.push({
        requirement: 'תאורת חירום לנתיבי מילוט',
        citation: emergencyLightingCitation,
        priority: 'required'
      });
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי ישיבה חיצונית
   */
  extractOutdoorSeatingRequirements(hasOutdoorSeating, documentText) {
    const requirements = [];
    
    if (hasOutdoorSeating) {
      const winterCitation = this.findSpecificText(documentText, 'עסק עד 150 מ"ר לרבות סגירת חורף המיועד ל- 50 איש לכל היותר ששטחו המבונה עד 150 מ"ר לרבות סגירת חורף ועונה על תנאי מסלול "אישור על יסוד תצהיר"');
      if (winterCitation) {
        requirements.push({
          requirement: 'דרישות סגירת חורף - עד 150 מ"ר ו-50 איש',
          citation: winterCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }


  /**
   * מחלץ דרישות לפי חיבור ביוב
   */
  extractSewerRequirements(hasSewerConnection, documentText) {
    const requirements = [];
    
    if (hasSewerConnection) {
      const separatorCitation = this.findSpecificText(documentText, 'מערכת סילוק שפכים של העסק תחובר למפריד שומן. מפריד שומן כאמור יותקן בהתאם להוראות המנהל');
      if (separatorCitation) {
        requirements.push({
          requirement: 'מפריד שומן - חיבור למערכת סילוק שפכים',
          citation: separatorCitation,
          priority: 'required'
        });
      }
    } else {
      const healthCitation = this.findSpecificText(documentText, 'שפכי העסק יסולקו אך ורק דרך מערכת סילוק שפכים אשר תחובר למערכת ביוב מרכזית באישור הרשות המקומית. כל פתרון אחר חייב לקבל את אישור משרד הבריאות');
      if (healthCitation) {
        requirements.push({
          requirement: 'אישור מיוחד ממשרד הבריאות למערכת סילוק שפכים',
          citation: healthCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי אספקת מים
   */
  extractWaterSupplyRequirements(hasWaterSupply, documentText) {
    const requirements = [];
    
    if (hasWaterSupply) {
      const pressureCitation = this.findSpecificText(documentText, 'בעל העסק ינקוט בכל האמצעים הדרושים כדי שאספקת המים תהא בכמות ובלחץ הדרושים לשם פעולתו התקינה של כלל ציוד הכיבוי שיש להתקינו בעסק');
      if (pressureCitation) {
        requirements.push({
          requirement: 'בדיקת לחץ מים לציוד כיבוי',
          citation: pressureCitation,
          priority: 'required'
        });
      }
      
      const backflowCitation = this.findSpecificText(documentText, 'לבקשה לחידוש רישיון יצורפו [...] דו"חות מתקין מוסמך על התקנה ובדיקה של אבזרים למניעת זרימת מים חוזרת (בפרק זה - מז"ח)');
      if (backflowCitation) {
        requirements.push({
          requirement: 'מז"ח - מכשיר מונע זרימת מים חוזרת',
          citation: backflowCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי שיטת עבודה
   */
  extractCookingMethodRequirements(cookingMethod, documentText) {
    const requirements = [];
    
    if (cookingMethod === 'בשל-קרר') {
      // חיפוש טקסט על בשל-קרר
      const cookingIndex = documentText.indexOf('בשל-קרר');
      if (cookingIndex !== -1) {
        const context = documentText.substring(Math.max(0, cookingIndex - 50), cookingIndex + 100);
        requirements.push({
          requirement: 'שיטת בשל-קרר - דרישות קירור מיוחדות',
          citation: context,
          priority: 'required'
        });
      }
    } else if (cookingMethod === 'בשל-הקפא') {
      // חיפוש טקסט על הקפאה
      const freezingIndex = documentText.indexOf('מינוס 18 מעלות');
      if (freezingIndex !== -1) {
        const context = documentText.substring(Math.max(0, freezingIndex - 50), freezingIndex + 100);
        requirements.push({
          requirement: 'מתקן הקפאה 18°C- - שיטת בשל-הקפא',
          citation: context,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי טיגון עמוק
   */
  extractDeepFryingRequirements(hasDeepFrying, documentText) {
    const requirements = [];
    
    if (hasDeepFrying) {
      // חיפוש טקסט על מנדפים
      const hoodIndex = documentText.indexOf('מנדף');
      if (hoodIndex !== -1) {
        const context = documentText.substring(Math.max(0, hoodIndex - 50), hoodIndex + 100);
        requirements.push({
          requirement: 'מנדפים וקולטי אדים - דרישות בטיחות',
          citation: context,
          priority: 'required'
        });
      }
      
      // חיפוש טקסט על שמן משומש
      const oilIndex = documentText.indexOf('שאריות שמן משומש');
      if (oilIndex !== -1) {
        const context = documentText.substring(Math.max(0, oilIndex - 50), oilIndex + 100);
        requirements.push({
          requirement: 'איסוף שמן משומש - כלי מיועד וחברת מיחזור',
          citation: context,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי מזון רגיש
   */
  extractSensitiveFoodRequirements(hasSensitiveFood, documentText) {
    const requirements = [];
    
    if (hasSensitiveFood) {
      // חיפוש טקסט על מזון רגיש
      const sensitiveFoodIndex = documentText.indexOf('מזון רגיש');
      if (sensitiveFoodIndex !== -1) {
        const context = documentText.substring(Math.max(0, sensitiveFoodIndex - 100), sensitiveFoodIndex + 200);
        requirements.push({
          requirement: 'הכנת מזון רגיש - דרישות מחמירות',
          citation: context,
          priority: 'required'
        });
      }
      
      // חיפוש טקסט על הפרדת מזון
      const separationIndex = documentText.indexOf('יש להפריד בין מזון גולמי למזון מעובד');
      if (separationIndex !== -1) {
        const context = documentText.substring(Math.max(0, separationIndex - 50), separationIndex + 100);
        requirements.push({
          requirement: 'הפרדה בין מזון גולמי למזון מעובד במתקנים נפרדים',
          citation: context,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי עובדים במשמרת
   */
  extractStaffRequirements(staffCount, documentText) {
    const requirements = [];
    
    if (staffCount > 10) {
      const changingCitation = this.findSpecificText(documentText, 'איזור שירותים ומלתחות לצוות העובדים, לפי מספר עובדים, כמפרט בקובץ תקנות 2844 "נספח א" תוספת שנייה');
      if (changingCitation) {
        requirements.push({
          requirement: 'חדרי הלבשה ושירותים לעובדים - לפי מספר עובדים',
          citation: changingCitation,
          priority: 'required'
        });
      }
    }
    
    if (staffCount > 20) {
      const diningCitation = this.findSpecificText(documentText, 'חדר אוכל לצוות העובדים במטבח. במידה והצוות אינו סועד בחדר האוכל הכללי, יש צורך בחדר אוכל לצוות המטבח בהתאם למספר הסועדים במשמרת');
      if (diningCitation) {
        requirements.push({
          requirement: 'חדר אוכל לצוות המטבח',
          citation: diningCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות לפי הכשרה במזון
   */
  extractTrainedStaffRequirements(hasTrainedStaff, documentText) {
    const requirements = [];
    
    if (!hasTrainedStaff) {
      const trainingCitation = this.findSpecificText(documentText, 'במטבח יימצאו עובדים, שעברו הדרכה לטיפול במזון על פי דרישת המנהל');
      if (trainingCitation) {
        requirements.push({
          requirement: 'חובת הכשרה לעובד בכיר - הדרכה לטיפול במזון',
          citation: trainingCitation,
          priority: 'required'
        });
      }
    } else {
      const seniorCitation = this.findSpecificText(documentText, 'במטבח ימצא עובד בכיר אחד לפחות, שעבר השתלמות בנושא איכות טיפול במזון (על-פי תכנית ההדרכה של משרד הבריאות ו/או HACCP)');
      if (seniorCitation) {
        requirements.push({
          requirement: 'עובד בכיר עם השתלמות HACCP - תיעוד הכשרות',
          citation: seniorCitation,
          priority: 'required'
        });
      }
    }
    
    return requirements;
  }

  /**
   * מחלץ דרישות מסמכים נדרשים (תמיד נדרשות)
   */
  extractDocumentRequirements(documentText) {
    const requirements = [];
    
    // דרישות מסמכים כלליות - תמיד נדרשות
    requirements.push({
      requirement: 'תכנית אדריכלית וסניטרית - תרשים סביבה 1:2500 ותכנית מגרש 1:250',
      citation: 'דרישת משרד הבריאות: תכנית אדריכלית וסניטרית שתכלול תרשים סביבה ותכנית מגרש',
      priority: 'required'
    });

    requirements.push({
      requirement: 'פירוט מערכות אספקת מים וסילוק שפכים',
      citation: 'דרישת משרד הבריאות: פירוט מערכות מים (שתייה, כיבוי אש, השקיה) וביוב',
      priority: 'required'
    });

    requirements.push({
      requirement: 'תכנית מפורטת בקנה מידה 1:100 עם תנוחה וחתך',
      citation: 'דרישת משרד הבריאות: תכנית עם מידות וייעוד חדרים, פתחי אוורור, ציפוי קירות',
      priority: 'required'
    });

    requirements.push({
      requirement: 'פרשה טכנית - מספר מבקרים וסידורים תברואיים',
      citation: 'דרישת משרד הבריאות: פרשה טכנית כוללת מספר מבקרים ופירוט מדורים',
      priority: 'required'
    });

    return requirements;
  }

  /**
   * מחלץ דרישות מניעת עישון (תמיד נדרשות)
   */
  extractSmokingPreventionRequirements(documentText) {
    const requirements = [];
    
    // דרישות מניעת עישון - תמיד נדרשות
    requirements.push({
      requirement: 'שלטי איסור עישון לפי חוק הגבלת העישון',
      citation: 'חוק הגבלת העישון: בעל העסק יקבע שלטים המורים על איסור העישון',
      priority: 'required'
    });

    requirements.push({
      requirement: 'איסור הצבת מאפרות למעט במקום נפרד לעישון',
      citation: 'חוק הגבלת העישון: לא יציב מאפרה למעט במקום נפרד לחלוטין שהוקצה לעישון',
      priority: 'required'
    });

    return requirements;
  }

  /**
   * מחלץ דרישות הדברת מזיקים (תמיד נדרשות)
   */
  extractPestControlRequirements(documentText) {
    const requirements = [];
    
    // דרישות הדברת מזיקים - תמיד נדרשות
    requirements.push({
      requirement: 'הדברה על ידי מדביר מוסמך בעל היתר',
      citation: 'דרישת משרד הבריאות: כל פעולות ההדברה ירוכזו על ידי מדביר בעל היתר',
      priority: 'required'
    });

    requirements.push({
      requirement: 'שימוש בתכשירי הדברה מאושרים בלבד',
      citation: 'דרישת משרד הבריאות: הדברה רק בתכשירים המאושרים על ידי המשרד לאיכות הסביבה',
      priority: 'required'
    });

    requirements.push({
      requirement: 'יומן ותיק הדברה - תיעוד פעולות הדברה',
      citation: 'דרישת משרד הבריאות: יומן ביצוע פעולות הדברה ותיק הדברה ינוהלו על ידי העסק',
      priority: 'required'
    });

    return requirements;
  }

  /**
   * מחלץ דרישות שילוט (תמיד נדרשות)
   */
  extractSignageRequirements(documentText) {
    const requirements = [];
    
    // דרישות שילוט - תמיד נדרשות
    requirements.push({
      requirement: 'שלטי יציאה - גוון לבן על רקע ירוק, אותיות 15 ס"מ',
      citation: 'דרישת כבאות והצלה: שלטי "יציאה" מעל פתחי העסק בגוון לבן על רקע ירוק',
      priority: 'required'
    });

    requirements.push({
      requirement: 'תאורה לשלטי יציאה - רשת חשמל + סוללות 60 דקות',
      citation: 'דרישת כבאות והצלה: תאורה לשלטים מרשת החשמל וממקור עצמאי למשך 60 דקות',
      priority: 'required'
    });

    requirements.push({
      requirement: 'שלטים פולטי אור - לוחות חשמל ומפסקים',
      citation: 'דרישת כבאות והצלה: שלטים פולטי אור על לוחות חשמל ("חשמל, לא לכבות במים")',
      priority: 'required'
    });

    return requirements;
  }

  /**
   * מחלץ דרישות מי שתייה (תמיד נדרשות)
   */
  extractWaterQualityRequirements(documentText) {
    const requirements = [];
    
    // דרישות מי שתייה - תמיד נדרשות
    requirements.push({
      requirement: 'חיבור למערכת מים מאושרת על ידי רשות הבריאות',
      citation: 'דרישת משרד הבריאות: מים יסופקו על ידי חיבור למערכת מאושרת',
      priority: 'required'
    });

    requirements.push({
      requirement: 'מכשיר מונע זרימה חוזרת (מז"ח) - בדיקה תקופתית',
      citation: 'דרישת משרד הבריאות: התקנת מכשיר מונע זרימה חוזרת והפרדה בין מערכות מים',
      priority: 'required'
    });

    requirements.push({
      requirement: 'ניקוי וחיטוי מערכת מים לפי הנחיות משרד הבריאות',
      citation: 'דרישת משרד הבריאות: ניקוי וחיטוי מערכת אספקת מים לרבות בריכה',
      priority: 'required'
    });

    return requirements;
  }

  /**
   * מחלץ דרישות פסולת (תמיד נדרשות)
   */
  extractWasteManagementRequirements(documentText) {
    const requirements = [];
    
    // דרישות ניהול פסולת - תמיד נדרשות
    requirements.push({
      requirement: 'פתרון סילוק פסולת לפי תקנות התכנון והבנייה',
      citation: 'דרישת משרד הבריאות: פתרון סילוק פסולת תואם תקנות התכנון והבנייה',
      priority: 'required'
    });

    requirements.push({
      requirement: 'מכלי קיבול לפסולת - כמות ומקומות מתאימים',
      citation: 'דרישת משרד הבריאות: מכלי קיבול שלמים עם מכסים למניעת חדירת מזיקים',
      priority: 'required'
    });

    requirements.push({
      requirement: 'איסור שפיכת שמן משומש לביוב',
      citation: 'דרישת משרד הבריאות: אין לשפוך שמן משומש לביוב - יש לאסוף בנפרד',
      priority: 'required'
    });

    return requirements;
  }

  /**
   * מחפש טקסט ספציפי במסמך ומחזיר אותו
   * @param {string} documentText - טקסט המסמך
   * @param {string} searchText - טקסט לחיפוש
   * @returns {string|null} הטקסט שנמצא או null
   */
  findSpecificText(documentText, searchText) {
    if (!documentText || !searchText) return null;
    
    // חיפוש מדויק
    if (documentText.includes(searchText)) {
      return searchText;
    }
    
    // חיפוש מילות מפתח חשובות
    const keywords = searchText.split(' ').filter(word => word.length > 3);
    
    for (const keyword of keywords) {
      if (documentText.includes(keyword)) {
        // מציאת המשפט שמכיל את המילה
        const sentences = documentText.split(/[.!?]/);
        for (const sentence of sentences) {
          if (sentence.includes(keyword)) {
            return sentence.trim();
          }
        }
      }
    }
    
    return null;
  }

  /**
   * מחלץ מקור מהמסמך לפי מיקום
   * @param {string} documentText - טקסט המסמך
   * @param {number} index - מיקום בטקסט
   * @returns {string} מקור
   */
  extractSource(documentText, index) {
    if (index === -1 || !documentText) return 'מסמך רגולטורי';
    
    // חיפוש מקור קרוב למיקום
    const beforeText = documentText.substring(Math.max(0, index - 100), index);
    const afterText = documentText.substring(index, index + 100);
    
    // חיפוש מילות מפתח למקור
    const sources = ['משרד הבריאות', 'כבאות והצלה', 'רשות מקומית', 'משטרה', 'מנהל'];
    
    for (const source of sources) {
      if (beforeText.includes(source) || afterText.includes(source)) {
        return source;
      }
    }
    
    return 'מסמך רגולטורי';
  }

  /**
   * מחלץ מילות מפתח מ-trigger
   * @param {string} trigger - trigger
   * @returns {Array} מילות מפתח
   */
  extractKeywords(trigger) {
    const keywordMap = {
      // q1 - שטח העסק
      'פטור ממערכת גילוי אש': ['עד 50 מ"ר', 'פטור מהתקנת גלגלון', 'מטפי כיבוי מסוג אבקה יבשה'],
      'גלגלון כיבוי בסיסי': ['עד 120 מ"ר', 'גלגלון כיבוי אש', 'זרנוק בקוטר'],
      'דרישות כיבוי בינוניות': ['עד 120 מ"ר', 'גלגלון כיבוי אש', 'מזנק צמוד'],
      'עמדות כיבוי מלאות': ['מעל 120 מ"ר', 'עמדות כיבוי אש', 'ברז כיבוי'],
      'מערכת מתזים': ['מעל 301 מ"ר', 'מעל 300 איש', 'מערכת כיבוי אש אוטומטית'],
      'לוח פיקוד כבאים': ['מערכת מתזים', 'תקן ישראלי ת"י 1596'],
      
      // q2 - מקומות ישיבה
      'פתח יציאה אחד 0.9מ\'': ['עד 50 איש', 'פתח יציאה אחד', '0.9 מ\' נטו'],
      'שני פתחי יציאה 1.1מ\'': ['למעלה מ- 50 איש', 'שני פתחי יציאה', '1.1 מ\' נטו'],
      'דרישות תברואה מוגברות': ['מספר השירותים', 'מתקני התברואה', 'פרק 3 להל"ת'],
      'דרישות מיוחדות': ['למעלה מ- 500 איש', 'שלושה פתחים', '1.1 מ\' נטו'],
      'מערכת כריזה': ['מעל 300 איש', 'מערכת מסירת הודעות', 'כריזת חירום'],
      'מפסק חשמל חירום': ['מערכת מסירת הודעות', 'ספק כוח עצמאי'],
      
      // q3 - תפוסה מקסימלית
      'דרישות בסיסיות': ['קיבולת קהל מקסימלית'],
      'ידית בהלה בדלתות': ['למעלה מ- 100 איש', 'ידית בהלה', 'מנגנון בהלה'],
      'דרישות מוגברות': ['מעל 300 איש', 'מערכת מתזים'],
      'מערכת מתזים חובה': ['מעל 301 מ"ר', 'מעל 300 איש'],
      'מערכת מסירת הודעות': ['מעל 300 איש', 'כריזת חירום'],
      
      // q4 - אלכוהול
      'שילוט איסור מכירה לקטינים': ['משקאות משכרים', '18 שנים', 'שילוט'],
      'תנאי רישוי משטרה (בוטל)': ['משטרת ישראל', 'איננה נותנת אישור'],
      'דרישות אחסון מיוחדות': ['משקאות משכרים', 'אחסון'],
      
      // q5 - גז
      'בדיקת מערכת גז ת"י 158': ['תקן ישראלי ת"י 158', 'מערכת הגפ"מ'],
      'התקני הפסקת זרימה': ['התקנים להפסקת זרימת גז', 'דליפה'],
      'מערכת כיבוי במנדפים': ['מנדפים', 'תקן ישראלי ת"י 5356'],
      'אישור בודק גז מוסמך': ['בעל רישיון לעבודת גפ"מ', 'אישור'],
      
      // q6 - משלוחים
      'דרישות נספח ב\' - שליחת מזון': ['שליחת מזון', 'נספח ב\'', 'מ. הבריאות 2012'],
      'אזור ייעודי להכנת משלוחים': ['הכנה של מזון למשלוחים', 'מדור להכנת משלוחים'],
      'דרישות רכב להובלת מזון': ['רכב שליחת מזון', 'הובלת מזון'],
      'בקרת טמפרטורה במשלוחים': ['טמפרטורת אוויר', 'מזון רגיש', 'מדחום']
    };
    
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (trigger.includes(key)) {
        return keywords;
      }
    }
    
    return [trigger];
  }

  /**
   * מחלץ משפט מלא
   * @param {string} text - טקסט
   * @param {number} index - אינדקס
   * @returns {string} משפט מלא
   */
  extractFullSentence(text, index) {
    let start = text.lastIndexOf('.', index);
    start = start === -1 ? 0 : start + 1;
    
    let end = text.indexOf('.', index);
    end = end === -1 ? text.length : end + 1;
    
    return text.substring(start, end).trim();
  }

  /**
   * מחלץ מקור
   * @param {string} text - טקסט
   * @param {number} index - אינדקס
   * @returns {Object} מקור
   */
  extractSource(text, index) {
    // חיפוש פרק וסעיף
    const beforeText = text.substring(0, index);
    const chapterMatch = beforeText.match(/פרק (\d+)/g);
    const sectionMatch = beforeText.match(/(\d+\.\d+)/g);
    
    return {
      chapter: chapterMatch ? chapterMatch[chapterMatch.length - 1] : 'לא ידוע',
      section: sectionMatch ? sectionMatch[sectionMatch.length - 1] : 'לא ידוע',
      title: 'לא ידוע'
    };
  }

  /**
   * מקטלג דרישה
   * @param {string} requirement - דרישה
   * @returns {string} קטגוריה
   */
  categorizeRequirement(requirement) {
    const text = requirement.toLowerCase();
    
    if (text.includes('כיבוי') || text.includes('אש') || text.includes('גלגלון')) {
      return 'בטיחות אש';
    }
    if (text.includes('יציאה') || text.includes('מילוט') || text.includes('בהלה')) {
      return 'יציאות חירום';
    }
    if (text.includes('גז') || text.includes('מנדף')) {
      return 'בטיחות גז';
    }
    if (text.includes('משלוח') || text.includes('דיליברי')) {
      return 'שירות משלוחים';
    }
    if (text.includes('בשר') || text.includes('עוף') || text.includes('דגים')) {
      return 'בטיחות מזון';
    }
    if (text.includes('אוורור') || text.includes('וונטילציה')) {
      return 'אוורור';
    }
    if (text.includes('מעלית') || text.includes('מילוט')) {
      return 'נגישות';
    }
    if (text.includes('חשמל') || text.includes('לוח')) {
      return 'חשמל';
    }
    if (text.includes('ביוב') || text.includes('מים')) {
      return 'מים וביוב';
    }
    if (text.includes('תכנית') || text.includes('אדריכלית') || text.includes('סניטרית') || text.includes('פרשה טכנית')) {
      return 'מסמכים נדרשים';
    }
    if (text.includes('עישון') || text.includes('מאפרה')) {
      return 'מניעת עישון';
    }
    if (text.includes('הדברה') || text.includes('מזיקים') || text.includes('מדביר')) {
      return 'הדברת מזיקים';
    }
    if (text.includes('שלט') || text.includes('שילוט') || text.includes('תאורה')) {
      return 'שילוט';
    }
    if (text.includes('פסולת') || text.includes('אשפה') || text.includes('שמן')) {
      return 'ניהול פסולת';
    }
    if (text.includes('קירור') || text.includes('הקפאה')) {
      return 'קירור והקפאה';
    }
    if (text.includes('טיגון') || text.includes('שמן')) {
      return 'טיגון';
    }
    if (text.includes('עובדים') || text.includes('כוח אדם')) {
      return 'כוח אדם';
    }
    
    return 'כללי';
  }

  /**
   * מחשב עדיפות
   * @param {string} requirement - דרישה
   * @returns {string} עדיפות
   */
  calculatePriority(requirement) {
    const text = requirement.toLowerCase();
    
    if (text.includes('חובה') || text.includes('חייב') || text.includes('נדרש')) {
      return 'critical';
    }
    if (text.includes('מומלץ') || text.includes('רצוי')) {
      return 'recommended';
    }
    
    return 'required';
  }

  /**
   * מאחד דרישות
   * @param {Array} requirements - דרישות
   * @returns {Object} דרישות מאוחדות
   */
  consolidateRequirements(requirements) {
    const consolidated = {};
    
    requirements.forEach(req => {
      const category = req.category;
      if (!consolidated[category]) {
        consolidated[category] = [];
      }
      consolidated[category].push(req);
    });
    
    return consolidated;
  }
}

module.exports = new GradedQuestionnaire();
