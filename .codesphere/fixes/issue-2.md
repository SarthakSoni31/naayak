# Proposed Fix for Issue #2

### Root Cause & Approach
The asynchronous route handlers in `src/api/departments.js` lack `try...catch` blocks. If a database failure occurs or an invalid ObjectID is supplied in route parameters, the promises will reject unhandled, causing the server to hang or crash. 

We will wrap the logic of each route handler in a `try...catch` block and return a standard JSON error response (consistent with `src/api/grievances.js`).

### Proposed Code Fix

Update `src/api/departments.js` as follows:

```javascript
const express = require('express');
const router = express.Router();
const Department = require('../../models/department');
const Adhikari = require('../../models/adhikari');

router.get('/', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).lean();
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/officers', async (req, res) => {
  try {
    const adhikaris = await Adhikari.find({ department: req.params.id, isApproved: true })
      .select('name designation').lean();
    res.json({ success: true, adhikaris });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
```

### Verification
1. Start the server and send a `GET` request to `/api/departments/:id/officers` with an invalid/malformed MongoDB ObjectId (e.g., `/api/departments/invalid-id/officers`).
2. Verify that the response returns an HTTP 500 status with `{ success: false, error: "..." }` instead of hanging or crashing the server due to an unhandled promise rejection.

---
*Formulated by @SarthakSoni31 via CodeSphere AI*