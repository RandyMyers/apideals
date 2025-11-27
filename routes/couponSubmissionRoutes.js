const express = require('express');
const router = express.Router();
const couponSubmissionController = require('../controllers/couponSubmissionController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { validate } = require('../utils/validation');
const { couponValidation } = require('../utils/validation');

// User routes (require authentication)
router.post('/submit',
  authMiddleware,
  validate(couponValidation.submit),
  couponSubmissionController.submitCoupon
);

router.get('/my-submissions',
  authMiddleware,
  couponSubmissionController.getUserSubmissions
);

router.get('/my-submissions/stats',
  authMiddleware,
  couponSubmissionController.getUserSubmissionStats
);

router.get('/:id',
  authMiddleware,
  couponSubmissionController.getSubmissionById
);

router.put('/:id',
  authMiddleware,
  validate(couponValidation.submit),
  couponSubmissionController.updateSubmission
);

router.delete('/:id',
  authMiddleware,
  couponSubmissionController.deleteSubmission
);

// Admin routes (require admin authentication)
router.get('/admin/pending',
  authMiddleware,
  adminMiddleware(['superAdmin', 'couponManager']),
  couponSubmissionController.getPendingSubmissions
);

router.get('/admin/stats',
  authMiddleware,
  adminMiddleware(['superAdmin', 'couponManager']),
  couponSubmissionController.getSubmissionStats
);

router.post('/admin/:id/approve',
  authMiddleware,
  adminMiddleware(['superAdmin', 'couponManager']),
  couponSubmissionController.approveSubmission
);

router.post('/admin/:id/reject',
  authMiddleware,
  adminMiddleware(['superAdmin', 'couponManager']),
  couponSubmissionController.rejectSubmission
);

module.exports = router;


