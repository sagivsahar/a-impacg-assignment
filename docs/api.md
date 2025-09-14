# תיעוד API - מערכת הערכת רישוי עסקים

## סקירה כללית

API המערכת מספק endpoints לניהול הערכת רישוי עסקים, כולל קבלת דרישות רישוי, הערכת עסקים ויצירת דוחות מותאמים אישית באמצעות AI.

**Base URL**: `http://localhost:3001/api`

## Authentication

כרגע המערכת לא דורשת אימות, אך מומלץ להוסיף API key בעתיד.

## Endpoints

### 1. הערכת עסק

#### POST /assess

מבצע הערכה מלאה של עסק ומחזיר דוח מותאם אישית.

**Request:**
```http
POST /api/assess
Content-Type: application/json

{
  "businessData": {
    "size": 80,
    "seating": 30,
    "businessType": "restaurant",
    "additionalFeatures": ["food_service", "gas_usage", "delivery"],
    "description": "מסעדה קטנה עם מטבח גז ומשלוחים"
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "businessData": {
    "size": 80,
    "seating": 30,
    "businessType": "restaurant",
    "additionalFeatures": ["food_service", "gas_usage", "delivery"],
    "description": "מסעדה קטנה עם מטבח גז ומשלוחים"
  },
  "requirements": [
    {
      "id": "license_basic",
      "title": "רישיון עסק בסיסי",
      "description": "רישיון עסק נדרש לכל עסק מסחרי בישראל",
      "category": "licensing",
      "priority": "high",
      "estimatedCost": "500-1000 ₪",
      "timeToComplete": "30-60 ימים",
      "authority": "רשות הרישוי המקומית"
    }
  ],
  "report": {
    "summary": "דוח מותאם אישית עבור מסעדה...",
    "sections": [
      {
        "title": "דרישות חובה",
        "content": "פירוט דרישות חובה..."
      }
    ],
    "fullContent": "תוכן מלא של הדוח..."
  },
  "complexity": {
    "score": 7,
    "level": "medium",
    "analysis": {
      "totalRequirements": 5,
      "highPriorityCount": 3,
      "categories": {
        "licensing": 2,
        "safety": 2,
        "health": 1
      }
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requirementsCount": 5,
    "aiGenerated": true
  }
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing required fields",
  "message": "Missing fields: size, seating",
  "requiredFields": ["size", "seating", "businessType", "additionalFeatures"]
}
```

**Response (Error - 500):**
```json
{
  "error": "Assessment failed",
  "message": "An error occurred while processing the assessment"
}
```

#### GET /assess/sample

מחזיר נתוני עסק לדוגמה לבדיקה.

**Request:**
```http
GET /api/assess/sample
```

**Response:**
```json
{
  "success": true,
  "sampleData": {
    "size": 80,
    "seating": 30,
    "businessType": "restaurant",
    "additionalFeatures": ["food_service", "gas_usage", "delivery"],
    "description": "מסעדה קטנה עם מטבח גז ומשלוחים"
  },
  "message": "Use this sample data to test the assessment endpoint"
}
```

#### POST /assess/validate

מבצע ולידציה של נתוני עסק.

**Request:**
```http
POST /api/assess/validate
Content-Type: application/json

{
  "businessData": {
    "size": 80,
    "seating": 30,
    "businessType": "restaurant",
    "additionalFeatures": ["food_service"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "errors": [],
  "warnings": [
    "Large business size may require additional permits"
  ],
  "businessData": {
    "size": 80,
    "seating": 30,
    "businessType": "restaurant",
    "additionalFeatures": ["food_service"]
  }
}
```

### 2. דרישות רישוי

#### GET /requirements

מחזיר רשימת דרישות רישוי עם אפשרות סינון.

**Query Parameters:**
- `category` (optional): סינון לפי קטגוריה
- `priority` (optional): סינון לפי עדיפות
- `businessType` (optional): סינון לפי סוג עסק

**Request:**
```http
GET /api/requirements?category=safety&priority=high
```

**Response:**
```json
{
  "success": true,
  "requirements": [
    {
      "id": "fire_safety_50",
      "title": "אישור בטיחות אש - עסקים מעל 50 מ\"ר",
      "description": "אישור מכבי אש נדרש לעסקים ששטחם עולה על 50 מ\"ר",
      "category": "safety",
      "priority": "high",
      "sizeThreshold": 50,
      "businessTypes": ["restaurant", "cafe", "retail"],
      "estimatedCost": "800-1500 ₪",
      "timeToComplete": "14-30 ימים",
      "authority": "מכבי אש ישראל"
    }
  ],
  "count": 1,
  "filters": {
    "category": "safety",
    "priority": "high",
    "businessType": null
  }
}
```

#### GET /requirements/categories

מחזיר רשימת קטגוריות זמינות.

**Request:**
```http
GET /api/requirements/categories
```

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": "licensing",
      "name": "רישוי",
      "count": 3
    },
    {
      "id": "safety",
      "name": "בטיחות",
      "count": 2
    },
    {
      "id": "health",
      "name": "בריאות",
      "count": 1
    }
  ]
}
```

#### GET /requirements/business-types

מחזיר רשימת סוגי עסקים נתמכים.

**Request:**
```http
GET /api/requirements/business-types
```

**Response:**
```json
{
  "success": true,
  "businessTypes": [
    {
      "id": "restaurant",
      "name": "מסעדה",
      "description": "עסק הגשת מזון עם מקומות ישיבה"
    },
    {
      "id": "cafe",
      "name": "קפה",
      "description": "עסק הגשת משקאות ומזון קל"
    },
    {
      "id": "retail",
      "name": "חנות קמעונאות",
      "description": "עסק מכירת מוצרים לצרכן"
    }
  ]
}
```

#### GET /requirements/features

מחזיר רשימת מאפיינים נוספים זמינים.

**Request:**
```http
GET /api/requirements/features
```

**Response:**
```json
{
  "success": true,
  "features": [
    {
      "id": "food_service",
      "name": "הגשת מזון",
      "description": "הכנה והגשה של מזון"
    },
    {
      "id": "gas_usage",
      "name": "שימוש בגז",
      "description": "שימוש בגז לבישול או חימום"
    },
    {
      "id": "delivery",
      "name": "משלוחים",
      "description": "שירות משלוחים ללקוחות"
    }
  ]
}
```

#### GET /requirements/:id

מחזיר דרישה ספציפית לפי ID.

**Request:**
```http
GET /api/requirements/license_basic
```

**Response:**
```json
{
  "success": true,
  "requirement": {
    "id": "license_basic",
    "title": "רישיון עסק בסיסי",
    "description": "רישיון עסק נדרש לכל עסק מסחרי בישראל",
    "category": "licensing",
    "priority": "high",
    "sizeThreshold": 0,
    "seatingThreshold": 0,
    "businessTypes": ["restaurant", "cafe", "retail", "office", "workshop", "warehouse"],
    "estimatedCost": "500-1000 ₪",
    "timeToComplete": "30-60 ימים",
    "authority": "רשות הרישוי המקומית",
    "documentsRequired": ["תעודת זהות", "חוזה שכירות", "תכנית עסק", "אישור מס הכנסה"],
    "renewalPeriod": "שנתי"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "Requirement not found",
  "message": "No requirement found with ID: invalid_id"
}
```

### 3. בדיקת תקינות

#### GET /health

מחזיר סטטוס תקינות המערכת.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## Error Handling

### קודי שגיאה נפוצים:

- **400 Bad Request**: נתונים לא תקינים או חסרים
- **404 Not Found**: משאב לא נמצא
- **429 Too Many Requests**: חריגה ממגבלת בקשות
- **500 Internal Server Error**: שגיאה פנימית בשרת

### מבנה שגיאה:
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "details": "Additional error details (development only)"
}
```

## Rate Limiting

המערכת מגבילה בקשות ל-100 בקשות לכל IP ב-15 דקות.

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642248000
```

## CORS

המערכת תומכת ב-CORS עם הגדרות הבאות:

- **Origin**: `http://localhost:3000` (פיתוח)
- **Methods**: GET, POST, PUT, DELETE
- **Headers**: Content-Type, Authorization
- **Credentials**: true

## Data Models

### BusinessData
```typescript
interface BusinessData {
  size: number;                    // גודל העסק במ"ר
  seating: number;                 // מספר מקומות ישיבה
  businessType: string;            // סוג העסק
  additionalFeatures: string[];    // מאפיינים נוספים
  description?: string;            // תיאור נוסף (אופציונלי)
}
```

### Requirement
```typescript
interface Requirement {
  id: string;                      // מזהה ייחודי
  title: string;                   // כותרת הדרישה
  description: string;             // תיאור מפורט
  category: string;                // קטגוריה
  priority: 'high' | 'medium' | 'low';  // עדיפות
  sizeThreshold?: number;          // סף גודל מינימלי
  seatingThreshold?: number;       // סף מקומות ישיבה מינימלי
  businessTypes?: string[];        // סוגי עסקים רלוונטיים
  requiredFeatures?: string[];     // מאפיינים נדרשים
  estimatedCost?: string;          // עלות משוערת
  timeToComplete?: string;         // זמן ביצוע
  authority?: string;              // גוף מאשר
  documentsRequired?: string[];    // מסמכים נדרשים
  renewalPeriod?: string;          // תקופת חידוש
}
```

### AssessmentResult
```typescript
interface AssessmentResult {
  success: boolean;
  businessData: BusinessData;
  requirements: Requirement[];
  report: {
    summary: string;
    sections: Array<{
      title: string;
      content: string;
    }>;
    fullContent: string;
  };
  complexity: {
    score: number;
    level: 'low' | 'medium' | 'high';
    analysis: {
      totalRequirements: number;
      highPriorityCount: number;
      categories: Record<string, number>;
    };
  };
  metadata: {
    timestamp: string;
    requirementsCount: number;
    aiGenerated: boolean;
  };
}
```

## דוגמאות שימוש

### JavaScript (Fetch)
```javascript
// הערכת עסק
const businessData = {
  size: 80,
  seating: 30,
  businessType: 'restaurant',
  additionalFeatures: ['food_service', 'gas_usage'],
  description: 'מסעדה קטנה'
};

const response = await fetch('http://localhost:3001/api/assess', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ businessData }),
});

const result = await response.json();
console.log(result);
```

### cURL
```bash
# הערכת עסק
curl -X POST http://localhost:3001/api/assess \
  -H "Content-Type: application/json" \
  -d '{
    "businessData": {
      "size": 80,
      "seating": 30,
      "businessType": "restaurant",
      "additionalFeatures": ["food_service", "gas_usage"],
      "description": "מסעדה קטנה"
    }
  }'

# קבלת דרישות
curl http://localhost:3001/api/requirements?category=safety

# בדיקת תקינות
curl http://localhost:3001/api/health
```

### Python (requests)
```python
import requests

# הערכת עסק
business_data = {
    "size": 80,
    "seating": 30,
    "businessType": "restaurant",
    "additionalFeatures": ["food_service", "gas_usage"],
    "description": "מסעדה קטנה"
}

response = requests.post(
    'http://localhost:3001/api/assess',
    json={'businessData': business_data}
)

result = response.json()
print(result)
```

## הערות חשובות

1. **עדכונים**: API עשוי להשתנות בעתיד - מומלץ לעקוב אחר גרסאות
2. **ביצועים**: זמני תגובה תלויים בעומס השרת ובעיבוד AI
3. **אבטחה**: מומלץ להשתמש ב-HTTPS בסביבת ייצור
4. **תיעוד**: תיעוד זה מתעדכן עם כל שינוי ב-API
5. **תמיכה**: לשאלות ותמיכה, פנה לצוות הפיתוח
