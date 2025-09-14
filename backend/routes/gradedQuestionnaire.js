const express = require('express');
const router = express.Router();
const gradedQuestionnaire = require('../services/gradedQuestionnaire');
const aiReportService = require('../services/aiReportService');

/**
 * GET /api/graded-questionnaire/questions/:businessType
 * קבלת שאלות מדורגות לסוג עסק ספציפי
 */
router.get('/questions/:businessType?', async (req, res) => {
  try {
    const { businessType } = req.params;
    const effectiveBusinessType = businessType || 'מסעדה';
    
    console.log(`🔍 מביא שאלות מדורגות לסוג עסק: ${effectiveBusinessType}`);
    
    const questions = gradedQuestionnaire.getQuestionsForBusinessType(effectiveBusinessType);
    
    // הוספת מידע על סוג העסק
    const businessTypeInfo = {
      isSeating: gradedQuestionnaire.isSeatingBusiness(effectiveBusinessType),
      isFood: gradedQuestionnaire.isFoodBusiness(effectiveBusinessType),
      isWorkplace: gradedQuestionnaire.isWorkplace(effectiveBusinessType),
      isRetail: gradedQuestionnaire.isRetailBusiness(effectiveBusinessType)
    };
    
    res.json({
      success: true,
      businessType: effectiveBusinessType,
      businessTypeInfo,
      questions: questions,
      metadata: {
        totalQuestions: Object.keys(questions).length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating graded questions:', error);
    res.status(500).json({
      error: 'Failed to generate graded questions',
      message: error.message
    });
  }
});

/**
 * POST /api/graded-questionnaire/process
 * עיבוד תשובות השאלון המדורג
 */
router.post('/process', async (req, res) => {
  try {
    const { answers, businessType } = req.body;
    const effectiveBusinessType = businessType || 'מסעדה';

    if (!answers) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Answers are required'
      });
    }

    console.log('🔄 מעבד תשובות שאלון מדורג...');
    console.log('📊 סוג עסק:', effectiveBusinessType);
    console.log('📝 מספר תשובות:', Object.keys(answers).length);

    // עיבוד התשובות
    const result = await gradedQuestionnaire.processAnswers(answers, effectiveBusinessType);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Processing failed',
        message: result.error
      });
    }

    // יצירת דוח AI (אם זמין)
    let aiReport = null;
    try {
      const aiResult = await aiReportService.generateReport(
        effectiveBusinessType,
        answers,
        result.requirements
      );
      if (aiResult.success) {
        aiReport = aiResult;
      }
    } catch (aiError) {
      console.log('⚠️ AI report generation failed, using fallback');
    }

    res.json({
      success: true,
      message: 'שאלון מדורג עובד בהצלחה',
      data: {
        businessProfile: result.businessProfile,
        requirements: result.requirements,
        aiReport: aiReport,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('Graded questionnaire processing error:', error);
    res.status(500).json({
      error: 'Graded questionnaire processing failed',
      message: error.message
    });
  }
});

/**
 * GET /api/graded-questionnaire/status
 * בדיקת סטטוס השאלון המדורג
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Graded questionnaire service is running',
    features: [
      'Dynamic questions based on business type',
      'Trigger-based requirement extraction',
      'Citation extraction from regulatory document',
      'Priority-based requirement categorization',
      'AI-powered report generation',
      'Sample data generation'
    ],
    questionCategories: {
      'basic': 'מידע בסיסי (חובה)',
      'services': 'שירותים ופעילויות',
      'location': 'מיקום ומבנה',
      'infrastructure': 'תשתיות קיימות',
      'foodPreparation': 'הכנת מזון',
      'staff': 'כוח אדם'
    },
    supportedBusinessTypes: [
      'מסעדה', 'בית קפה', 'בר', 'חנות', 'משרד', 'מפעל'
    ],
    timestamp: new Date().toISOString()
  });
});

// הוסרו מסלולי דוגמה/השוואה שאינם בשימוש כדי לפשט את ה-API

module.exports = router;
