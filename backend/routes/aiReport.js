const express = require('express');
const router = express.Router();
const aiReportService = require('../services/aiReportService');

/**
 * POST /api/ai-report/generate
 * יוצר דוח AI מקצועי על בסיס תשובות השאלון
 */
router.post('/generate', async (req, res) => {
  try {
    const { businessType, answers, requirements } = req.body;
    const effectiveBusinessType = businessType || 'מסעדה';

    if (!answers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: answers'
      });
    }

    console.log('🤖 יוצר דוח AI...');
    console.log(`📊 סוג עסק: ${effectiveBusinessType}`);
    console.log(`📝 מספר תשובות: ${Object.keys(answers).length}`);

    let finalRequirements = requirements;
    
    // אם לא נשלחו דרישות, נטען אותן אוטומטית
    if (!requirements || Object.keys(requirements).length === 0) {
      console.log('📋 טוען דרישות אוטומטית...');
      const gradedQuestionnaireService = require('../services/gradedQuestionnaire');
      // סדר ארגומנטים: (answers, businessType)
      const requirementsResult = await gradedQuestionnaireService.processAnswers(answers, effectiveBusinessType);
      finalRequirements = requirementsResult.requirements;
      console.log(`📋 נטענו ${Object.keys(finalRequirements).length} קטגוריות דרישות`);
    } else {
      console.log(`📋 מספר קטגוריות דרישות: ${Object.keys(requirements).length}`);
    }

    const report = await aiReportService.generateReport(effectiveBusinessType, answers, finalRequirements);

    res.json({
      success: true,
      data: {
        report: report,
        requirements: finalRequirements,
        generatedAt: new Date().toISOString(),
        businessType: effectiveBusinessType,
        // משתקף ללקוח ישירות
        prompt: report?.prompt,
        chatMessage: report?.chatMessage,
        responseRaw: report?.responseRaw
      }
    });

  } catch (error) {
    console.error('Error generating AI report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI report',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/ai-report/status
 * בדיקת סטטוס שירות הדוחות
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'AI Report Generator',
      status: 'active',
      features: [
        'Professional business licensing reports',
        'Priority-based organization',
        'Clear action items',
        'Cost and time estimates'
      ]
    }
  });
});

module.exports = router;


