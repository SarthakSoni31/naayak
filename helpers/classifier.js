// helpers/classifier.js
// Rule-based classifier simulating NLP for the hackathon demo

const CATEGORY_KEYWORDS = {
  Infrastructure: ['road', 'bridge', 'pothole', 'construction', 'building', 'street', 'footpath', 'highway', 'path', 'drain', 'sewer'],
  Health: ['hospital', 'doctor', 'medicine', 'health', 'clinic', 'ambulance', 'disease', 'sick', 'medical', 'nurse', 'vaccination'],
  Utilities: ['water', 'electricity', 'power', 'light', 'gas', 'supply', 'bill', 'connection', 'meter', 'pipeline'],
  Education: ['school', 'college', 'teacher', 'student', 'books', 'fee', 'scholarship', 'university', 'education', 'exam'],
  Sanitation: ['garbage', 'waste', 'toilet', 'sanitation', 'cleaning', 'hygiene', 'dump', 'trash', 'dustbin', 'smell'],
  Police: ['crime', 'theft', 'police', 'harassment', 'safety', 'robbery', 'assault', 'violence', 'fir', 'complaint'],
  Revenue: ['land', 'property', 'tax', 'revenue', 'mutation', 'registration', 'patta', 'khasra', 'records', 'certificate'],
  Agriculture: ['crop', 'farm', 'farmer', 'irrigation', 'seeds', 'fertilizer', 'harvest', 'agriculture', 'kisan', 'drought']
};

const URGENCY_HIGH = ['emergency', 'urgent', 'critical', 'immediately', 'danger', 'life', 'death', 'flood', 'fire', 'disaster', 'collapse', 'accident', 'serious', 'severe'];
const URGENCY_MEDIUM = ['soon', 'quickly', 'important', 'problem', 'issue', 'broken', 'damaged', 'not working', 'delay', 'pending'];

const DEPT_MAP = {
  Infrastructure: 'PWD',
  Health: 'HEALTH',
  Utilities: 'UTILITIES',
  Education: 'EDUCATION',
  Sanitation: 'SANITATION',
  Police: 'POLICE',
  Revenue: 'REVENUE',
  Agriculture: 'AGRICULTURE',
  Other: 'GENERAL'
};

function classifyGrievance(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Category scoring
  const scores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = keywords.filter(k => lower.includes(k)).length;
  }

  const bestCategory = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0];

  const category = bestCategory[1] > 0 ? bestCategory[0] : 'Other';
  const confidence = Math.min(100, bestCategory[1] * 25);

  // Urgency detection
  let urgency = 'LOW';
  if (URGENCY_HIGH.some(k => lower.includes(k))) urgency = 'HIGH';
  else if (URGENCY_MEDIUM.some(k => lower.includes(k))) urgency = 'MEDIUM';

  return {
    category,
    urgency,
    confidence,
    suggestedDeptCode: DEPT_MAP[category] || 'GENERAL'
  };
}

module.exports = { classifyGrievance, DEPT_MAP };
