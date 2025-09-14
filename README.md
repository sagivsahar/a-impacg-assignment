# מערכת הערכת רישוי עסקים - Business License Assessment System

## תיאור הפרויקט
מערכת חכמה לעזרה לבעלי עסקים בישראל להבין את דרישות הרישוי הרלוונטיות לעסק שלהם. המערכת משתמשת ב-AI ליצירת דוחות מותאמים אישית עם הדרישות הרגולטוריות הרלוונטיות.

## ארכיטקטורה
- **Frontend**: React עם ממשק משתמש פשוט ונגיש
- **Backend**: Node.js + Express עם API endpoints
- **AI Integration**: OpenAI GPT-4 ליצירת דוחות חכמים
- **Data**: JSON files עם נתוני רישוי מעובדים

## כלי AI בשימוש
- **Cursor AI**: פיתוח הקוד והארכיטקטורה
- **OpenAI GPT-4**: עיבוד חכם של דרישות רגולטוריות ויצירת דוחות מותאמים
- **notebooklm**: למציאת דרישות רלוונטיות מהקובץ

## התקנה והרצה

### דרישות מערכת
- Node.js 18+
- npm או yarn

### התקנה מהירה
```bash
# התקנת dependencies ל-backend
cd backend
npm install

# התקנת dependencies ל-frontend
cd ../frontend
npm install
```

### הרצת המערכת

#### 1. הרצת Backend
```bash
cd backend
npm start
```
השרת יעלה על פורט 3001: http://localhost:3001

#### 2. הרצת Frontend
```bash
cd frontend
npm start
```
האפליקציה תפתח בדפדפן: http://localhost:3000

### הגדרת משתני סביבה (אופציונלי)
צור קובץ `.env` בתיקיית backend:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**הערה**: המערכת עובדת גם בלי API key של OpenAI - היא תשתמש בדוח fallback אוטומטי.

## מבנה הפרויקט
```
business-license-system/
├── frontend/          # React application
├── backend/           # Node.js API server
├── data/             # נתוני רישוי מעובדים
├── docs/             # תיעוד
├── scripts/          # סקריפטי עיבוד נתונים
└── README.md
```

## API Endpoints
- `GET /api/graded-questionnaire/questions` - טעינת השאלון המדורג למסעדה
- `POST /api/ai-report/generate` - יצירת דוח AI ישירות מתשובות השאלון
- `GET /api/health` - בדיקת תקינות המערכת

## תיעוד נוסף
- [אסטרטגיית ניתוח PDF](docs/pdf-analysis-strategy.md)
- [יומן פיתוח](docs/development-log.md)

