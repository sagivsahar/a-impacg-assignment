# תיעוד API - מערכת הערכת רישוי עסקים

## סקירה כללית

API המערכת מספק נקודות קצה לשאלון, יצירת דוח AI ובדיקת תקינות.

**Base URL**: `http://localhost:3001/api`

## Authentication
כרגע המערכת לא דורשת אימות.

## Endpoints

### 1) שאלון מדורג
#### GET /graded-questionnaire/questions
מחזיר את שאלות השאלון למסעדה (ברירת מחדל).

Request:
```http
GET /api/graded-questionnaire/questions
```

Response (200):
```json
{
  "success": true,
  "businessType": "מסעדה",
  "questions": { "q1": { "id": "q1", "text": "גודל העסק (מ""ר)" }, "q2": { "id": "q2", "text": "מספר מקומות ישיבה" } }
}
```

### 2) יצירת דוח AI
#### POST /ai-report/generate
יוצר דוח מבוסס AI (או Fallback במקרה כשל/מכסה) מתשובות השאלון והדרישות שהופקו.

Request:
```http
POST /api/ai-report/generate
Content-Type: application/json

{
  "businessType": "מסעדה",
  "answers": { "area_sqm": 30, "seating_capacity": 20, "sensitive_food": true },
  "requirements": { "בטיחות אש": [{ "requirement": "מטפי כיבוי 6 ק""ג", "priority": "required" }] }
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "report": {
      "content": "...",
      "generatedBy": "ChatGPT-4 or Fallback System",
      "prompt": "...",
      "chatMessage": {"model": "gpt-4", "messages": [...]},
      "responseRaw": {"id": "chatcmpl_..."}
    },
    "requirements": {"בטיחות אש": [...]},
    "generatedAt": "2025-09-14T10:00:00.000Z",
    "businessType": "מסעדה"
  }
}
```

### 3) בריאות השרת
#### GET /health
בדיקת תקינות בסיסית.

Request:
```http
GET /api/health
```

Response:
```json
{ "status": "OK", "timestamp": "2025-09-14T10:30:00.000Z", "version": "1.0.0" }
```

## Error Handling
- 400: נתונים חסרים/שגויים
- 429: מכסה חריגה (AI)
- 500: שגיאה פנימית

## דגשים
- בעת כשל AI מוחזר דוח Fallback ו-Frontend מציג הודעה מתאימה.
- הדרישות נטענות כברירת מחדל מתוך `data/requirements_from_pdf.json`.
